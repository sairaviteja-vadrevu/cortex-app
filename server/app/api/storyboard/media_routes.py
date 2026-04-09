import logging
from pathlib import Path
from fastapi import UploadFile, File, Form, HTTPException, Depends
from typing import Optional

from ...config import settings
from ...db import get_db
from ...auth import get_current_user, check_project_access

from .route_helpers import router, _oid, _strip_mongo_id, _persist_url, _replicate_generate_image

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
ENTITY_COLLECTIONS = {"characters": "characters", "locations": "locations", "assets": "assets"}


@router.post("/projects/{project_id}/entities/{entity_type}/{entity_id}/reference")
async def upload_entity_reference(
    project_id: str,
    entity_type: str,
    entity_id: str,
    image: Optional[UploadFile] = File(None),
    reference_description: Optional[str] = Form(None),
    user: dict = Depends(get_current_user),
):
    """Upload a reference image and/or description for a character, location, or asset."""
    if entity_type not in ENTITY_COLLECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid entity_type: {entity_type}. Must be one of: {', '.join(ENTITY_COLLECTIONS)}")

    db = get_db()
    oid = _oid(project_id)

    # Check project exists and user has access
    proj = await db.projects.find_one({"_id": oid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_project_access(user, proj)

    collection_name = ENTITY_COLLECTIONS[entity_type]
    collection = db[collection_name]

    # Verify entity exists
    entity = await collection.find_one({"project_id": oid, "id": entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail=f"{entity_type[:-1].capitalize()} not found")

    update: dict = {}

    # Handle image upload
    if image and image.filename:
        # Validate content type
        if image.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid image type. Allowed: jpg, png, webp")

        # Validate extension
        ext = Path(image.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Invalid file extension. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

        # Read and validate size
        content = await image.read()
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail=f"Image too large. Maximum size: 10MB")

        # Save to uploads/{project_id}/{entity_type}/{entity_id}.{ext}
        from ...main import UPLOADS_DIR
        upload_dir = UPLOADS_DIR / project_id / entity_type
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Remove any existing file for this entity
        for existing in upload_dir.glob(f"{entity_id}.*"):
            existing.unlink()

        file_path = upload_dir / f"{entity_id}{ext}"
        file_path.write_bytes(content)

        update["image_url"] = f"/uploads/{project_id}/{entity_type}/{entity_id}{ext}"

    # Handle reference description
    if reference_description is not None:
        update["reference_description"] = reference_description

    if not update:
        raise HTTPException(status_code=400, detail="Provide an image and/or reference_description")

    await collection.update_one(
        {"project_id": oid, "id": entity_id},
        {"$set": update},
    )

    doc = await collection.find_one({"project_id": oid, "id": entity_id})
    return _strip_mongo_id(doc)


@router.patch("/projects/{project_id}/entities/{entity_type}/{entity_id}")
async def update_entity(project_id: str, entity_type: str, entity_id: str, body: dict, user: dict = Depends(get_current_user)):
    """Update entity fields (image_url, etc.)."""
    db = get_db()
    oid = _oid(project_id)
    proj = await db.projects.find_one({"_id": oid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_project_access(user, proj)

    collection = ENTITY_COLLECTIONS.get(entity_type)
    if not collection:
        raise HTTPException(status_code=400, detail=f"Invalid entity type: {entity_type}")

    allowed = {"image_url"}
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    result = await getattr(db, collection).update_one(
        {"project_id": oid, "id": entity_id}, {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"{entity_type[:-1].title()} not found")
    return {"ok": True}


STYLE_MAP = {
    "live-action-realistic": "Professional movie storyboard reference. Photorealistic, cinematic, real-world lighting and textures, shot on 35mm film, production-quality.",
    "live-action-stylized": "Professional movie storyboard reference. Cinematic with heightened stylized visuals, dramatic color grading, bold compositions, production design.",
    "animation-3d": "Professional animated movie storyboard reference. High-quality 3D CGI render, Pixar/DreamWorks style, smooth lighting, subsurface scattering.",
    "animation-2d": "Professional animated movie storyboard reference. Hand-drawn 2D animation style, cel-shaded, clean linework, vibrant flat colors.",
    "anime": "Professional anime movie storyboard reference. Japanese anime art style, expressive features, dynamic poses, detailed backgrounds.",
    "concept-art": "Professional movie pre-production concept art. Digital painting, matte painting quality, cinematic composition, production design.",
    "graphic-novel": "Professional movie storyboard reference. Graphic novel illustration, bold ink lines, dramatic shadows, comic book coloring.",
}

@router.post("/projects/{project_id}/entities/{entity_type}/{entity_id}/generate-image")
async def generate_entity_image(
    project_id: str,
    entity_type: str,
    entity_id: str,
    user: dict = Depends(get_current_user),
):
    """Generate an image for a character, location, or asset. Uses Klein if available, falls back to Replicate."""
    if entity_type not in ENTITY_COLLECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid entity_type: {entity_type}")

    db = get_db()
    oid = _oid(project_id)

    proj = await db.projects.find_one({"_id": oid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_project_access(user, proj)

    collection_name = ENTITY_COLLECTIONS[entity_type]
    collection = db[collection_name]

    entity = await collection.find_one({"project_id": oid, "id": entity_id})
    if not entity:
        raise HTTPException(status_code=404, detail=f"{entity_type[:-1].capitalize()} not found")

    # Build prompt
    prompt = entity.get("image_prompt") or entity.get("description") or entity.get("full_description")
    if not prompt:
        raise HTTPException(status_code=400, detail="No image prompt or description available for this entity")

    visual_style = proj.get("visual_style") or "live-action-realistic"
    style_prefix = STYLE_MAP.get(visual_style, f"Professional movie storyboard reference. Visual style: {visual_style}.")
    styled_prompt = f"{style_prefix} {prompt}"

    # Aspect ratios: characters portrait, locations landscape, assets square
    aspect_map = {"characters": ("3:4", 768, 1344), "locations": ("16:9", 1344, 768), "assets": ("1:1", 1024, 1024)}
    aspect_ratio, width, height = aspect_map.get(entity_type, ("16:9", 1344, 768))

    result_url = None

    # Try Klein first
    if settings.klein_api_key:
        try:
            from ...services.klein_client import generate_image, KleinError
            result_url = await generate_image(styled_prompt, width=width, height=height)
        except Exception as e:
            logger.warning(f"Klein failed, falling back to Replicate: {e}")

    # Fallback to Replicate
    if not result_url:
        result_url = await _replicate_generate_image(styled_prompt, aspect_ratio=aspect_ratio)

    # Persist to local storage so URL doesn't expire
    result_url = await _persist_url(result_url, project_id, f"entities/{entity_id}")

    await collection.update_one(
        {"project_id": oid, "id": entity_id},
        {"$set": {"image_url": result_url}},
    )

    doc = await collection.find_one({"project_id": oid, "id": entity_id})
    return _strip_mongo_id(doc)


@router.post("/projects/{project_id}/scenes/{scene_number}/shots/{shot_number}/generate-image")
async def generate_shot_image(
    project_id: str,
    scene_number: int,
    shot_number: int,
    user: dict = Depends(get_current_user),
):
    """Generate an image for a shot. Uses Klein with collage references if available, falls back to Replicate."""
    use_klein = bool(settings.klein_api_key)

    if use_klein:
        import tempfile
        from ...services.klein_client import generate_image, image_to_image_upload, wait_for_result, KleinError
        from ...services.collage import build_entity_collage

    db = get_db()
    oid = _oid(project_id)

    proj = await db.projects.find_one({"_id": oid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_project_access(user, proj)

    # Find the scene
    scene_doc = await db.scenes.find_one({"project_id": oid, "scene_number": scene_number})
    if not scene_doc:
        raise HTTPException(status_code=404, detail="Scene not found")

    # Find the shot within the scene
    shots = scene_doc.get("shots", [])
    shot = None
    shot_idx = None
    for i, s in enumerate(shots):
        if s.get("shot_number") == shot_number:
            shot = s
            shot_idx = i
            break
    if shot is None:
        raise HTTPException(status_code=404, detail="Shot not found")

    # Visual style prefix (same as entity endpoint)
    visual_style = proj.get("visual_style") or "live-action-realistic"
    style_map = {
        "live-action-realistic": "Professional movie storyboard frame. Photorealistic, cinematic, real-world lighting and textures, shot on 35mm film, production-quality.",
        "live-action-stylized": "Professional movie storyboard frame. Cinematic with heightened stylized visuals, dramatic color grading, bold compositions, production design.",
        "animation-3d": "Professional animated movie storyboard frame. High-quality 3D CGI render, Pixar/DreamWorks style, smooth lighting, subsurface scattering.",
        "animation-2d": "Professional animated movie storyboard frame. Hand-drawn 2D animation style, cel-shaded, clean linework, vibrant flat colors.",
        "anime": "Professional anime storyboard frame. Japanese anime art style, expressive features, dynamic poses, detailed backgrounds.",
        "concept-art": "Professional movie pre-production storyboard frame. Digital painting, matte painting quality, cinematic composition, production design.",
        "graphic-novel": "Professional movie storyboard frame. Graphic novel illustration, bold ink lines, dramatic shadows, comic book coloring.",
    }
    style_prefix = style_map.get(visual_style, f"Professional movie storyboard frame. Visual style: {visual_style}.")

    # Storyboard frame dimensions — 16:9 landscape
    width, height = 1344, 768

    # Collect ALL entity reference image URLs for the collage
    # Priority: location (sets the scene backdrop), then characters, then assets
    ref_urls: list[str] = []

    # Location image
    location_id = scene_doc.get("location_id")
    if location_id:
        loc = await db.locations.find_one({"project_id": oid, "id": location_id})
        if loc and loc.get("image_url"):
            ref_urls.append(loc["image_url"])

    # Character images (in order they appear in the shot)
    for char_id in shot.get("characters_in_frame", []):
        char = await db.characters.find_one({"project_id": oid, "id": char_id})
        if char and char.get("image_url"):
            ref_urls.append(char["image_url"])

    # Asset images
    for asset_id in shot.get("assets_in_frame", []):
        asset = await db.assets.find_one({"project_id": oid, "id": asset_id})
        if asset and asset.get("image_url"):
            ref_urls.append(asset["image_url"])

    # Find previous shot's generated image for visual continuity
    prev_shot_url: str | None = None
    if shot_number > 1:
        for s in shots:
            if s.get("shot_number") == shot_number - 1:
                prev_shot_url = s.get("image_url")
                break

    # Build character/location descriptions for prompt enrichment (used by Replicate fallback)
    char_descriptions = []
    for char_id in shot.get("characters_in_frame", []):
        char = await db.characters.find_one({"project_id": oid, "id": char_id})
        if char:
            char_descriptions.append(f"{char.get('name', '')}: {char.get('description', '')}")

    loc_description = ""
    if location_id:
        loc = await db.locations.find_one({"project_id": oid, "id": location_id})
        if loc:
            loc_description = loc.get("full_description") or loc.get("name", "")

    # Build temp files for collage and previous shot
    temp_files: list[str] = []

    async def _generate_one(prompt_text: str) -> str:
        """Generate a single image. Klein with collage if available, else Replicate."""
        # For Replicate fallback, enrich prompt with character/location descriptions
        enriched_prompt = prompt_text
        if char_descriptions:
            enriched_prompt += f". Characters in frame: {'; '.join(char_descriptions)}"
        if loc_description:
            enriched_prompt += f". Setting: {loc_description}"
        full_prompt = f"{style_prefix} {enriched_prompt}"

        # Try Klein with collage references
        if use_klein:
            collage_path: Path | None = None
            prev_shot_path: Path | None = None
            try:
                if ref_urls:
                    collage_file = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
                    temp_files.append(collage_file.name)
                    collage_file.close()
                    collage_path = await build_entity_collage(
                        ref_urls, Path(collage_file.name),
                        target_width=width, target_height=height,
                    )
                if prev_shot_url:
                    from ...services.collage import _download_image
                    prev_img = await _download_image(prev_shot_url)
                    if prev_img is not None:
                        prev_file = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
                        temp_files.append(prev_file.name)
                        prev_file.close()
                        prev_img.save(prev_file.name, "JPEG", quality=90)
                        prev_shot_path = Path(prev_file.name)

                if collage_path:
                    resp = await image_to_image_upload(full_prompt, file_path=collage_path, background_file_path=prev_shot_path)
                    result = await wait_for_result(resp["job_id"])
                    return result["result_url"]
                elif prev_shot_path:
                    resp = await image_to_image_upload(full_prompt, file_path=prev_shot_path)
                    result = await wait_for_result(resp["job_id"])
                    return result["result_url"]
                else:
                    return await generate_image(full_prompt, width=width, height=height)
            except Exception as e:
                logger.warning(f"Klein shot image failed, falling back to Replicate: {e}")

        # Fallback: Replicate
        return await _replicate_generate_image(full_prompt, aspect_ratio="16:9")

    try:
        stills = shot.get("stills") or []
        if stills and len(stills) > 1:
            for still_idx, still in enumerate(stills):
                prompt = still.get("image_prompt") or still.get("description")
                if not prompt:
                    continue
                result_url = await _generate_one(prompt)
                result_url = await _persist_url(result_url, project_id, f"shots/s{scene_number}")
                await db.scenes.update_one(
                    {"project_id": oid, "scene_number": scene_number},
                    {"$set": {f"shots.{shot_idx}.stills.{still_idx}.image_url": result_url}},
                )
        else:
            prompt = shot.get("image_prompt") or shot.get("description")
            if not prompt:
                raise HTTPException(status_code=400, detail="No image prompt available for this shot")
            result_url = await _generate_one(prompt)
            result_url = await _persist_url(result_url, project_id, f"shots/s{scene_number}")
            await db.scenes.update_one(
                {"project_id": oid, "scene_number": scene_number},
                {"$set": {f"shots.{shot_idx}.image_url": result_url}},
            )
    finally:
        import os
        for f in temp_files:
            try:
                os.unlink(f)
            except OSError:
                pass

    updated = await db.scenes.find_one({"project_id": oid, "scene_number": scene_number})
    return _strip_mongo_id(updated)
