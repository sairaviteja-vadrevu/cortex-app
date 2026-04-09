import asyncio
import logging
from bson import ObjectId
from fastapi import UploadFile, File, Form, HTTPException, Depends
from typing import Optional

from ...config import settings
from ...db import get_db
from ...auth import get_current_user, check_project_access
from ...models.enums import LLMProvider, DEFAULT_MODELS
from ...models.storyboard import (
    ProjectStatus, ProjectCreateResponse,
    ReferencePreferences, ProjectType,
)

from .route_helpers import router, _running_tasks, _oid, _load_project

logger = logging.getLogger(__name__)


# ─── Extraction Pipeline ─────────────────────────────────

async def _run_extraction_pipeline(
    project_id: str,
    script_text: str,
    provider: LLMProvider,
    model: Optional[str],
    genre: Optional[str],
    aesthetic: Optional[str],
    duration_minutes: Optional[float],
    notes: Optional[str] = None,
    visual_style: Optional[str] = None,
) -> None:
    """Background task: run sequential per-scene extraction with incremental DB saves."""
    from ...services.extraction import extract_storyboard, Character, Location, Asset, SceneBreakdown
    from ...services.pipeline_tracker import PipelineTracker
    from bson import ObjectId

    db = get_db()
    oid = ObjectId(project_id)
    resolved_model = model or DEFAULT_MODELS.get(provider, "gemini-2.5-flash")
    tracker = PipelineTracker(project_id=project_id, model=resolved_model)

    # Track which entity IDs have already been saved to avoid duplicates
    saved_char_ids: set[str] = set()
    saved_loc_ids: set[str] = set()
    saved_asset_ids: set[str] = set()

    async def on_scene_complete(
        scene_num: int,
        scene_bd: SceneBreakdown,
        characters: list[Character],
        locations: list[Location],
        assets: list[Asset],
    ) -> None:
        """Incrementally save new entities + scene to DB after each scene."""
        # Find new entities not yet saved
        new_chars = [c for c in characters if c.id not in saved_char_ids]
        new_locs = [l for l in locations if l.id not in saved_loc_ids]
        new_assets = [a for a in assets if a.id not in saved_asset_ids]

        inserts = []

        # Insert new entities
        if new_chars:
            char_docs = [{**c.model_dump(), "project_id": oid} for c in new_chars]
            inserts.append(db.characters.insert_many(char_docs))
            saved_char_ids.update(c.id for c in new_chars)

        if new_locs:
            loc_docs = [{**l.model_dump(), "project_id": oid} for l in new_locs]
            inserts.append(db.locations.insert_many(loc_docs))
            saved_loc_ids.update(l.id for l in new_locs)

        if new_assets:
            asset_docs = [{**a.model_dump(), "project_id": oid} for a in new_assets]
            inserts.append(db.assets.insert_many(asset_docs))
            saved_asset_ids.update(a.id for a in new_assets)

        # Insert scene
        scene_doc = {**scene_bd.model_dump(), "project_id": oid}
        inserts.append(db.scenes.insert_one(scene_doc))

        if inserts:
            await asyncio.gather(*inserts)

        # Update existing entities that got new scene_ids
        # (entities seen before but now appearing in a new scene)
        updates = []
        for c in characters:
            if c.id in saved_char_ids and c.id not in {nc.id for nc in new_chars}:
                # Already saved — update scene_ids if changed
                updates.append(
                    db.characters.update_one(
                        {"project_id": oid, "id": c.id},
                        {"$set": {"scene_ids": c.scene_ids}},
                    )
                )
        for l in locations:
            if l.id in saved_loc_ids and l.id not in {nl.id for nl in new_locs}:
                updates.append(
                    db.locations.update_one(
                        {"project_id": oid, "id": l.id},
                        {"$set": {"scene_ids": l.scene_ids}},
                    )
                )
        for a in assets:
            if a.id in saved_asset_ids and a.id not in {na.id for na in new_assets}:
                updates.append(
                    db.assets.update_one(
                        {"project_id": oid, "id": a.id},
                        {"$set": {"scene_ids": a.scene_ids}},
                    )
                )
        if updates:
            await asyncio.gather(*updates)

        # Update project totals incrementally
        await db.projects.update_one({"_id": oid}, {"$set": {
            "total_scenes": scene_num,
            "total_characters": len(characters),
            "total_locations": len(locations),
            "total_assets": len(assets),
        }})

    try:
        project = await extract_storyboard(
            script_text=script_text,
            provider=provider,
            model=model,
            genre=genre,
            aesthetic=aesthetic,
            duration_minutes=duration_minutes,
            tracker=tracker,
            notes=notes,
            visual_style=visual_style,
            on_scene_complete=on_scene_complete,
        )

        # Finalize: update character relationships and cross-reference maps
        # Update all characters with computed relationships
        char_updates = []
        for c in project.characters:
            char_updates.append(
                db.characters.update_one(
                    {"project_id": oid, "id": c.id},
                    {"$set": {
                        "relationships": c.relationships.model_dump() if c.relationships else None,
                        "scene_ids": c.scene_ids,
                    }},
                )
            )
        if char_updates:
            await asyncio.gather(*char_updates)

        # Update project doc to ready with final totals
        # Preserve user-provided title — only use LLM title if user didn't provide one
        proj_doc = await db.projects.find_one({"_id": oid}, {"title": 1})
        final_title = proj_doc.get("title") or project.title
        await db.projects.update_one({"_id": oid}, {"$set": {
            "status": "ready",
            "title": final_title,
            "genre": project.genre,
            "aesthetic": project.aesthetic,
            "detected_language": project.detected_language,
            "total_scenes": project.total_scenes,
            "total_characters": project.total_characters,
            "total_locations": project.total_locations,
            "total_assets": project.total_assets,
            "character_scene_map": project.character_scene_map,
            "location_scene_map": project.location_scene_map,
            "asset_scene_map": project.asset_scene_map,
        }})
        logger.info("Extraction complete for project %s", project_id)

    except asyncio.CancelledError:
        logger.info("Extraction cancelled for project %s", project_id)
        await db.projects.update_one({"_id": oid}, {"$set": {
            "status": "cancelled",
            "error_message": "Extraction was cancelled by user",
        }})
    except Exception as e:
        logger.exception("Extraction pipeline failed for project %s", project_id)
        await db.projects.update_one({"_id": oid}, {"$set": {
            "status": "error",
            "error_message": str(e),
        }})
    finally:
        _running_tasks.pop(project_id, None)


# ─── Create / Retry / List ───────────────────────────────

@router.post("/projects", response_model=ProjectCreateResponse)
async def create_project(
    script: Optional[UploadFile] = File(None),
    script_text: Optional[str] = Form(None),
    title: str = Form(...),
    genre: Optional[str] = Form(None),
    aesthetic: Optional[str] = Form(None),
    duration_minutes: Optional[float] = Form(None),
    llm_provider: str = Form("anthropic"),
    llm_model: Optional[str] = Form(None),
    access: Optional[str] = Form("all_members"),
    access_team_id: Optional[str] = Form(None),
    access_user_ids: Optional[str] = Form(None),
    provide_character_designs: Optional[bool] = Form(False),
    character_design_tiers: Optional[str] = Form(None),
    provide_location_references: Optional[bool] = Form(False),
    provide_asset_references: Optional[bool] = Form(False),
    notes: Optional[str] = Form(None),
    visual_style: Optional[str] = Form(None),
    project_type: Optional[str] = Form("standalone"),
    collection_id: Optional[str] = Form(None),
    season_number: Optional[int] = Form(None),
    episode_number: Optional[int] = Form(None),
    sort_order: Optional[int] = Form(None),
    user: dict = Depends(get_current_user),
):
    """Create a new storyboard project from a script upload or pasted text."""
    from ...services.ingest import ingest_script
    from datetime import datetime

    # Validate input
    if script is None and not script_text:
        raise HTTPException(status_code=400, detail="Provide either a script file or script_text")

    # Parse provider
    try:
        provider = LLMProvider(llm_provider)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid provider: {llm_provider}")

    # Check API key
    key_map = {
        LLMProvider.ANTHROPIC: settings.anthropic_api_key,
        LLMProvider.OPENAI: settings.openai_api_key,
        LLMProvider.GOOGLE: settings.google_api_key,
    }
    if not key_map.get(provider):
        raise HTTPException(status_code=503, detail=f"No API key configured for {provider.value}")

    # Ingest script (fast, no LLM)
    try:
        if script:
            content_bytes = await script.read()
            text, fmt = ingest_script(filename=script.filename, content_bytes=content_bytes)
        else:
            text, fmt = ingest_script(content_text=script_text)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Script ingestion failed: {e}")

    if not text or len(text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Script content is too short or empty")

    # Create shell project doc
    project_oid = ObjectId()
    project_id = str(project_oid)
    resolved_model = llm_model or DEFAULT_MODELS.get(provider, "")

    # Parse access user IDs (comma-separated string from form)
    parsed_access_user_ids = []
    if access_user_ids:
        parsed_access_user_ids = [uid.strip() for uid in access_user_ids.split(",") if uid.strip()]

    org_id = user.get("active_org_id", "")
    db = get_db()

    # Resolve project_type and auto-increment sort_order if in a collection
    resolved_project_type = project_type or "standalone"
    try:
        ProjectType(resolved_project_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid project_type: {resolved_project_type}")

    if resolved_project_type != "standalone":
        raise HTTPException(status_code=400, detail="Franchise and series projects are coming soon")

    resolved_sort_order = sort_order if sort_order is not None else 0
    if collection_id and sort_order is None:
        # Auto-increment: find max sort_order in the collection
        max_doc = await db.projects.find(
            {"collection_id": collection_id},
            {"sort_order": 1},
        ).sort("sort_order", -1).limit(1).to_list(length=1)
        resolved_sort_order = (max_doc[0]["sort_order"] + 1) if max_doc else 0

    project_doc = {
        "_id": project_oid,
        "title": title,
        "genre": genre,
        "aesthetic": aesthetic,
        "target_duration_minutes": duration_minutes,
        "detected_language": "unknown",
        "llm_provider": provider.value,
        "llm_model": resolved_model,
        "created_at": datetime.utcnow().isoformat(),
        "status": "processing",
        "error_message": None,
        "total_scenes": 0,
        "total_characters": 0,
        "total_locations": 0,
        "total_assets": 0,
        "raw_script": text,
        "character_scene_map": {},
        "location_scene_map": {},
        "asset_scene_map": {},
        "org_id": org_id,
        "access": access or "all_members",
        "access_team_id": access_team_id,
        "access_user_ids": parsed_access_user_ids,
        "created_by": str(user["_id"]),
        "project_type": resolved_project_type,
        "collection_id": collection_id,
        "sort_order": resolved_sort_order,
        "season_number": season_number,
        "episode_number": episode_number,
        "notes": notes,
        "visual_style": visual_style,
    }

    # Build reference preferences if any were provided
    if provide_character_designs or provide_location_references or provide_asset_references:
        parsed_tiers = []
        if character_design_tiers:
            parsed_tiers = [t.strip() for t in character_design_tiers.split(",") if t.strip()]
        project_doc["reference_preferences"] = ReferencePreferences(
            provide_character_designs=bool(provide_character_designs),
            character_design_tiers=parsed_tiers,
            provide_location_references=bool(provide_location_references),
            provide_asset_references=bool(provide_asset_references),
        ).model_dump()

    await db.projects.insert_one(project_doc)

    # Kick off background extraction (track task for cancellation)
    task = asyncio.create_task(_run_extraction_pipeline(
        project_id=project_id,
        script_text=text,
        provider=provider,
        model=llm_model,
        genre=genre,
        aesthetic=aesthetic,
        duration_minutes=duration_minutes,
        notes=notes,
        visual_style=visual_style,
    ))
    _running_tasks[project_id] = task

    return ProjectCreateResponse(project_id=project_id, status="processing", title=title)


@router.post("/projects/{project_id}/retry", response_model=ProjectStatus)
async def retry_project(
    project_id: str,
    llm_model: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    """Retry a failed project with an optionally different model."""
    db = get_db()
    oid = _oid(project_id)

    proj = await db.projects.find_one({"_id": oid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    await check_project_access(user, proj)

    if proj.get("status") not in ("error", "cancelled"):
        raise HTTPException(status_code=400, detail="Only failed or cancelled projects can be retried")

    raw_script = proj.get("raw_script")
    if not raw_script:
        raise HTTPException(status_code=400, detail="No script text stored for this project")

    provider = LLMProvider(proj["llm_provider"])
    resolved_model = llm_model or proj.get("llm_model") or DEFAULT_MODELS.get(provider, "")

    # Clear previous extraction results
    await asyncio.gather(
        db.characters.delete_many({"project_id": oid}),
        db.locations.delete_many({"project_id": oid}),
        db.assets.delete_many({"project_id": oid}),
        db.scenes.delete_many({"project_id": oid}),
    )

    # Reset project to processing
    await db.projects.update_one({"_id": oid}, {"$set": {
        "status": "processing",
        "error_message": None,
        "llm_model": resolved_model,
        "total_scenes": 0,
        "total_characters": 0,
        "total_locations": 0,
        "total_assets": 0,
    }})

    # Kick off extraction again (track task for cancellation)
    task = asyncio.create_task(_run_extraction_pipeline(
        project_id=project_id,
        script_text=raw_script,
        provider=provider,
        model=resolved_model,
        genre=proj.get("genre"),
        aesthetic=proj.get("aesthetic"),
        duration_minutes=proj.get("target_duration_minutes"),
        notes=proj.get("notes"),
        visual_style=proj.get("visual_style"),
    ))
    _running_tasks[project_id] = task

    return ProjectStatus(project_id=project_id, status="processing", error_message=None)
