import asyncio
import logging
import uuid
from pathlib import Path
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import httpx

from ...config import settings
from ...db import get_db
from ...auth import get_current_user
from ...models.enums import LLMProvider, AVAILABLE_MODELS, DEFAULT_MODELS

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

REPLICATE_API = "https://api.replicate.com/v1"
from ...models.storyboard import StoryboardProject

logger = logging.getLogger(__name__)

router = APIRouter()

# Track running extraction tasks for cancellation
_running_tasks: dict[str, asyncio.Task] = {}


# ─── Helpers ─────────────────────────────────────────────

def _oid(id_str: str) -> ObjectId:
    """Convert string to ObjectId, raising 404 on invalid format."""
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=404, detail="Project not found")


def _strip_mongo_id(doc: dict) -> dict:
    """Remove MongoDB's _id and project_id from a sub-document."""
    doc.pop("_id", None)
    doc.pop("project_id", None)
    return doc


async def _save_project(project: StoryboardProject) -> str:
    """Persist a StoryboardProject across normalized collections.
    Returns the project_id (hex string of the ObjectId)."""
    db = get_db()
    project_oid = ObjectId()
    project_id = str(project_oid)

    # Project metadata document
    project_doc = {
        "_id": project_oid,
        "title": project.title,
        "genre": project.genre,
        "aesthetic": project.aesthetic,
        "target_duration_minutes": project.target_duration_minutes,
        "detected_language": project.detected_language,
        "llm_provider": project.llm_provider.value,
        "llm_model": project.llm_model,
        "created_at": project.created_at,
        "status": project.status,
        "error_message": project.error_message,
        "raw_script": project.raw_script,
        "total_scenes": project.total_scenes,
        "total_characters": project.total_characters,
        "total_locations": project.total_locations,
        "total_assets": project.total_assets,
        "character_scene_map": project.character_scene_map,
        "location_scene_map": project.location_scene_map,
        "asset_scene_map": project.asset_scene_map,
        "reference_preferences": project.reference_preferences.model_dump() if project.reference_preferences else None,
    }

    # Batch-build sub-collection docs — store app-level `id` as-is
    char_docs = [{**c.model_dump(), "project_id": project_oid} for c in project.characters]
    loc_docs = [{**l.model_dump(), "project_id": project_oid} for l in project.locations]
    asset_docs = [{**a.model_dump(), "project_id": project_oid} for a in project.assets]
    scene_docs = [{**s.model_dump(), "project_id": project_oid} for s in project.scenes]

    # Write all collections (project first, rest in parallel)
    await db.projects.insert_one(project_doc)
    inserts = []
    if char_docs:
        inserts.append(db.characters.insert_many(char_docs))
    if loc_docs:
        inserts.append(db.locations.insert_many(loc_docs))
    if asset_docs:
        inserts.append(db.assets.insert_many(asset_docs))
    if scene_docs:
        inserts.append(db.scenes.insert_many(scene_docs))
    if inserts:
        await asyncio.gather(*inserts)

    return project_id


async def _load_project(project_id: str) -> StoryboardProject:
    """Load a full StoryboardProject by querying all collections in parallel."""
    db = get_db()
    oid = _oid(project_id)

    # Parallel fetch across all 5 collections
    proj_fut = db.projects.find_one({"_id": oid})
    chars_fut = db.characters.find({"project_id": oid}).to_list(length=None)
    locs_fut = db.locations.find({"project_id": oid}).to_list(length=None)
    assets_fut = db.assets.find({"project_id": oid}).to_list(length=None)
    scenes_fut = db.scenes.find({"project_id": oid}).sort("scene_number", 1).to_list(length=None)

    proj, chars, locs, assets, scenes = await asyncio.gather(
        proj_fut, chars_fut, locs_fut, assets_fut, scenes_fut
    )

    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Strip MongoDB fields from sub-docs
    chars = [_strip_mongo_id(c) for c in chars]
    locs = [_strip_mongo_id(l) for l in locs]
    assets = [_strip_mongo_id(a) for a in assets]
    scenes = [_strip_mongo_id(s) for s in scenes]

    return StoryboardProject(
        project_id=project_id,
        title=proj["title"],
        genre=proj.get("genre"),
        aesthetic=proj.get("aesthetic"),
        target_duration_minutes=proj.get("target_duration_minutes"),
        detected_language=proj["detected_language"],
        llm_provider=proj["llm_provider"],
        llm_model=proj["llm_model"],
        created_at=proj["created_at"],
        status=proj.get("status", "ready"),
        error_message=proj.get("error_message"),
        total_scenes=proj["total_scenes"],
        total_characters=proj["total_characters"],
        total_locations=proj["total_locations"],
        total_assets=proj["total_assets"],
        raw_script=proj.get("raw_script"),
        final_video_url=proj.get("final_video_url"),
        characters=chars,
        locations=locs,
        assets=assets,
        scenes=scenes,
        character_scene_map=proj.get("character_scene_map", {}),
        location_scene_map=proj.get("location_scene_map", {}),
        asset_scene_map=proj.get("asset_scene_map", {}),
        org_id=str(proj.get("org_id", "")),
        access=proj.get("access", "all_members"),
        access_team_id=proj.get("access_team_id"),
        access_user_ids=proj.get("access_user_ids", []),
        created_by=proj.get("created_by", ""),
        reference_preferences=proj.get("reference_preferences"),
        project_type=proj.get("project_type", "standalone"),
        collection_id=proj.get("collection_id"),
        sort_order=proj.get("sort_order", 0),
        season_number=proj.get("season_number"),
        episode_number=proj.get("episode_number"),
    )


# ─── Providers ────────────────────────────────────────────

@router.get("/providers")
async def get_providers(user: dict = Depends(get_current_user)):
    """Return providers that have API keys configured."""
    providers = []
    key_map = {
        LLMProvider.ANTHROPIC: settings.anthropic_api_key,
        LLMProvider.OPENAI: settings.openai_api_key,
        LLMProvider.GOOGLE: settings.google_api_key,
    }
    for provider, key in key_map.items():
        if key:
            providers.append({
                "provider": provider.value,
                "models": AVAILABLE_MODELS[provider],
                "default_model": DEFAULT_MODELS[provider],
            })
    return providers


async def _persist_url(url: str, project_id: str, subfolder: str = "media") -> str:
    """Download a remote URL (e.g., Replicate temporary output) and save it locally.
    Returns a permanent /uploads/... URL path."""
    if not url or not url.startswith("http"):
        return url

    ext = ".mp4"
    lower = url.split("?")[0].lower()
    for check_ext in [".png", ".jpg", ".jpeg", ".webp", ".mp3", ".wav", ".webm"]:
        if lower.endswith(check_ext):
            ext = check_ext
            break

    dest_dir = UPLOADS_DIR / project_id / subfolder
    dest_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex[:12]}{ext}"
    dest_path = dest_dir / filename

    try:
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            dest_path.write_bytes(resp.content)
        return f"/uploads/{project_id}/{subfolder}/{filename}"
    except Exception as e:
        logger.warning(f"Failed to persist URL {url[:80]}: {e}")
        return url


async def _replicate_generate_image(prompt: str, aspect_ratio: str = "16:9") -> str:
    """Fallback image generation via Replicate (Google Nano Banana)."""
    if not settings.replicate_key:
        raise HTTPException(status_code=503, detail="Neither KLEIN_API_KEY nor REPLICATE_KEY is configured")

    headers = {"Authorization": f"Bearer {settings.replicate_key}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(
            f"{REPLICATE_API}/models/google/nano-banana/predictions",
            headers=headers,
            json={"input": {"prompt": prompt, "num_outputs": 1, "aspect_ratio": aspect_ratio, "output_format": "png"}},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Replicate submit failed: {resp.text}")

        prediction = resp.json()
        while prediction.get("status") not in ("succeeded", "failed", "canceled"):
            await asyncio.sleep(2)
            poll = await client.get(
                f"{REPLICATE_API}/predictions/{prediction['id']}",
                headers={"Authorization": f"Bearer {settings.replicate_key}"},
                timeout=60,
            )
            prediction = poll.json()

        if prediction["status"] != "succeeded":
            raise HTTPException(status_code=502, detail=prediction.get("error", "Image generation failed"))

        output = prediction.get("output")
        return output[0] if isinstance(output, list) else output


async def _count_project_media(db, project_ids: list) -> dict:
    """Count images, videos, audio across projects. Returns {oid: {images, videos, audio}}."""
    counts = {}
    if not project_ids:
        return counts

    # Entity images
    for coll in ["characters", "locations", "assets"]:
        pipeline = [
            {"$match": {"project_id": {"$in": project_ids}, "image_url": {"$exists": True, "$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$project_id", "c": {"$sum": 1}}},
        ]
        async for row in db[coll].aggregate(pipeline):
            counts.setdefault(row["_id"], {"images": 0, "videos": 0, "audio": 0})["images"] += row["c"]

    # Scene-level media
    pipeline = [
        {"$match": {"project_id": {"$in": project_ids}}},
        {"$project": {
            "project_id": 1,
            "si": {"$size": {"$filter": {"input": {"$ifNull": ["$shots", []]}, "cond": {"$and": [{"$ne": ["$$this.image_url", None]}, {"$ne": ["$$this.image_url", ""]}]}}}},
            "sv": {"$size": {"$filter": {"input": {"$ifNull": ["$shots", []]}, "cond": {"$and": [{"$ne": ["$$this.video_url", None]}, {"$ne": ["$$this.video_url", ""]}]}}}},
            "vo": {"$cond": [{"$and": [{"$ne": ["$voiceover_url", None]}, {"$ne": ["$voiceover_url", ""]}]}, 1, 0]},
            "mu": {"$cond": [{"$and": [{"$ne": ["$music_url", None]}, {"$ne": ["$music_url", ""]}]}, 1, 0]},
            "scv": {"$cond": [{"$or": [
                {"$and": [{"$ne": ["$scene_video_url", None]}, {"$ne": ["$scene_video_url", ""]}]},
                {"$and": [{"$ne": ["$assembled_url", None]}, {"$ne": ["$assembled_url", ""]}]},
            ]}, 1, 0]},
        }},
        {"$group": {"_id": "$project_id", "i": {"$sum": "$si"}, "v": {"$sum": {"$add": ["$sv", "$scv"]}}, "a": {"$sum": {"$add": ["$vo", "$mu"]}}}},
    ]
    async for row in db.scenes.aggregate(pipeline):
        c = counts.setdefault(row["_id"], {"images": 0, "videos": 0, "audio": 0})
        c["images"] += row["i"]
        c["videos"] += row["v"]
        c["audio"] += row["a"]

    return counts
