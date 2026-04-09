import asyncio
import logging
from bson import ObjectId
from fastapi import Form, HTTPException, Depends
from typing import Optional

from ...db import get_db
from ...auth import get_current_user, check_project_access
from .route_helpers import _persist_url, _count_project_media
from ...models.enums import LLMProvider
from ...models.storyboard import (
    StoryboardProject, ProjectSummary, ProjectStatus, ProjectAccess,
    CharacterUpdate, PipelineProgress, PipelineTokenUsage,
)

from .route_helpers import router, _running_tasks, _oid, _strip_mongo_id, _load_project

logger = logging.getLogger(__name__)


# ─── List / Status / Cancel / Get ─────────────────────────

@router.get("/projects", response_model=list[ProjectSummary])
async def list_projects(collection_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """List projects for the user's active org, filtered by access level."""
    db = get_db()
    active_org_id = user.get("active_org_id", "")
    user_id = str(user["_id"])

    query: dict = {"org_id": active_org_id} if active_org_id else {"created_by": user_id}
    if collection_id is not None:
        query["collection_id"] = collection_id
    projection = {
        "title": 1, "genre": 1, "aesthetic": 1, "detected_language": 1,
        "llm_provider": 1, "llm_model": 1, "created_at": 1,
        "total_scenes": 1, "total_characters": 1,
        "status": 1, "error_message": 1,
        "org_id": 1, "access": 1, "access_team_id": 1,
        "access_user_ids": 1, "created_by": 1,
        "project_type": 1, "collection_id": 1,
        "sort_order": 1, "season_number": 1, "episode_number": 1,
    }
    cursor = db.projects.find(query, projection).sort("created_at", -1)
    docs = await cursor.to_list(length=None)

    # Check user's role in the org
    is_owner = False
    for m in user.get("organizations", []):
        if m["org_id"] == active_org_id and m["role"] == "owner":
            is_owner = True
            break

    # Pre-load user's team memberships for team-based filtering
    user_team_ids: set[str] = set()
    if not is_owner and active_org_id:
        org = await db.organizations.find_one({"_id": ObjectId(active_org_id)}, {"teams": 1})
        if org:
            for team in org.get("teams", []):
                if user_id in team.get("member_user_ids", []):
                    user_team_ids.add(team["id"])

    # Batch-count media across all projects
    media_counts = await _count_project_media(db, [doc["_id"] for doc in docs])

    results = []
    for doc in docs:
        # Filter by access level — only owners see everything
        if not is_owner:
            # Creator always sees their own project
            if doc.get("created_by") == user_id:
                pass  # allow
            else:
                access = doc.get("access", "all_members")
                if access == "private":
                    continue
                if access == "select_users":
                    allowed = doc.get("access_user_ids", [])
                    if user_id not in allowed:
                        continue
                if access == "team":
                    team_id = doc.get("access_team_id")
                    if not team_id or team_id not in user_team_ids:
                        continue

        mc = media_counts.get(doc["_id"], {"images": 0, "videos": 0, "audio": 0})
        results.append(ProjectSummary(
            project_id=str(doc["_id"]),
            title=doc["title"],
            genre=doc.get("genre"),
            aesthetic=doc.get("aesthetic"),
            detected_language=doc.get("detected_language", "unknown"),
            llm_provider=doc["llm_provider"],
            llm_model=doc["llm_model"],
            created_at=doc["created_at"],
            total_scenes=doc.get("total_scenes", 0),
            total_characters=doc.get("total_characters", 0),
            total_images=mc["images"],
            total_videos=mc["videos"],
            total_audio=mc["audio"],
            status=doc.get("status", "ready"),
            error_message=doc.get("error_message"),
            org_id=str(doc.get("org_id", "")),
            access=doc.get("access", "all_members"),
            access_team_id=doc.get("access_team_id"),
            access_user_ids=doc.get("access_user_ids", []),
            created_by=doc.get("created_by", ""),
            project_type=doc.get("project_type", "standalone"),
            collection_id=doc.get("collection_id"),
            sort_order=doc.get("sort_order", 0),
            season_number=doc.get("season_number"),
            episode_number=doc.get("episode_number"),
        ))

    return results


@router.get("/projects/{project_id}/status", response_model=ProjectStatus)
async def get_project_status(project_id: str, user: dict = Depends(get_current_user)):
    """Lightweight status check for a project, with pipeline progress if processing."""
    db = get_db()
    oid = _oid(project_id)
    doc = await db.projects.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_project_access(user, doc)

    progress = None
    raw_progress = doc.get("pipeline_progress")
    if raw_progress and doc.get("status") == "processing":
        phases_completed = raw_progress.get("phases_completed", [])
        total_phases = raw_progress.get("total_phases", 7)
        scenes_processed = raw_progress.get("scenes_processed", 0)
        scenes_total = raw_progress.get("scenes_total", 0)

        # Compute percent complete from phases + scene progress
        phase_pct = (len(phases_completed) / total_phases * 100) if total_phases else 0
        scene_pct = (scenes_processed / scenes_total * 100) if scenes_total else 0
        # Weighted: phases contribute 40%, scene progress 60%
        percent = int(phase_pct * 0.4 + scene_pct * 0.6) if scenes_total else int(phase_pct)
        percent = min(percent, 99)  # Never show 100% while processing

        token_raw = raw_progress.get("token_usage", {})
        token_usage = PipelineTokenUsage(
            input_tokens=token_raw.get("input_tokens", 0),
            output_tokens=token_raw.get("output_tokens", 0),
            total_tokens=token_raw.get("total_tokens", 0),
            estimated_remaining_tokens=token_raw.get("estimated_remaining_tokens"),
            calls_made=token_raw.get("calls_made", 0),
        )

        progress = PipelineProgress(
            current_phase=raw_progress.get("current_phase", ""),
            phase_label=raw_progress.get("phase_label", ""),
            phases_completed=phases_completed,
            total_phases=total_phases,
            scenes_processed=scenes_processed,
            scenes_total=scenes_total,
            percent_complete=percent,
            token_usage=token_usage,
            cost_usd=raw_progress.get("cost_usd", 0.0),
            estimated_total_cost_usd=raw_progress.get("estimated_total_cost_usd"),
            elapsed_seconds=raw_progress.get("elapsed_seconds", 0),
            started_at=raw_progress.get("started_at"),
        )

    return ProjectStatus(
        project_id=project_id,
        status=doc.get("status", "ready"),
        error_message=doc.get("error_message"),
        progress=progress,
    )


@router.post("/projects/{project_id}/cancel", response_model=ProjectStatus)
async def cancel_project(project_id: str, user: dict = Depends(get_current_user)):
    """Cancel a running extraction pipeline."""
    db = get_db()
    oid = _oid(project_id)

    doc = await db.projects.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_project_access(user, doc)

    if doc.get("status") != "processing":
        raise HTTPException(status_code=400, detail="Project is not currently processing")

    # Cancel the asyncio task if it exists
    task = _running_tasks.get(project_id)
    if task and not task.done():
        task.cancel()

    # Update status immediately
    await db.projects.update_one({"_id": oid}, {"$set": {
        "status": "cancelled",
        "error_message": "Extraction was cancelled by user",
    }})

    return ProjectStatus(
        project_id=project_id,
        status="cancelled",
        error_message="Extraction was cancelled by user",
    )


@router.get("/projects/{project_id}", response_model=StoryboardProject)
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    """Retrieve a project by ID. Returns shell project if still processing."""
    db = get_db()
    oid = _oid(project_id)

    # Check status first
    proj = await db.projects.find_one({"_id": oid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    await check_project_access(user, proj)

    status = proj.get("status", "ready")
    if status != "ready":
        # Return shell project with empty arrays (no sub-collection queries)
        return StoryboardProject(
            project_id=project_id,
            title=proj["title"],
            genre=proj.get("genre"),
            aesthetic=proj.get("aesthetic"),
            target_duration_minutes=proj.get("target_duration_minutes"),
            detected_language=proj.get("detected_language", "unknown"),
            llm_provider=proj["llm_provider"],
            llm_model=proj["llm_model"],
            created_at=proj["created_at"],
            status=status,
            error_message=proj.get("error_message"),
            raw_script=proj.get("raw_script"),
            total_scenes=proj.get("total_scenes", 0),
            total_characters=proj.get("total_characters", 0),
            total_locations=proj.get("total_locations", 0),
            total_assets=proj.get("total_assets", 0),
            characters=[],
            locations=[],
            assets=[],
            scenes=[],
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

    return await _load_project(project_id)


# ─── Update / Delete ─────────────────────────────────────

@router.patch("/projects/{project_id}")
async def update_project(project_id: str, body: dict, user: dict = Depends(get_current_user)):
    """Update project access settings. Only creator or org admin/owner."""
    db = get_db()
    oid = _oid(project_id)

    proj = await db.projects.find_one({"_id": oid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Authorization: only creator or admin+
    user_id = str(user["_id"])
    is_creator = proj.get("created_by") == user_id
    org_id = str(proj.get("org_id", ""))
    is_admin = False
    for m in user.get("organizations", []):
        if m["org_id"] == org_id and m["role"] in ("owner", "admin"):
            is_admin = True
            break
    if not is_creator and not is_admin:
        raise HTTPException(status_code=403, detail="Only the creator or an admin can update this project")

    # Build $set from allowed fields
    allowed_fields = {"access", "access_team_id", "access_user_ids", "title", "final_video_url"}
    update: dict = {}
    for field in allowed_fields:
        if field in body:
            value = body[field]
            # Validate access enum
            if field == "access":
                try:
                    ProjectAccess(value)
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Invalid access value: {value}")
            if field == "title":
                if not isinstance(value, str) or not value.strip():
                    raise HTTPException(status_code=400, detail="Title must be a non-empty string")
                value = value.strip()
            if field == "final_video_url" and value and value.startswith("http"):
                value = await _persist_url(value, project_id, "final")
            update[field] = value

    if not update:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    await db.projects.update_one({"_id": oid}, {"$set": update})

    # Return updated project metadata
    updated = await db.projects.find_one({"_id": oid})
    return {
        "project_id": project_id,
        "title": updated.get("title", ""),
        "access": updated.get("access", "all_members"),
        "access_team_id": updated.get("access_team_id"),
        "access_user_ids": updated.get("access_user_ids", []),
    }


@router.patch("/projects/{project_id}/characters/{character_id}")
async def update_character(project_id: str, character_id: str, body: CharacterUpdate, user: dict = Depends(get_current_user)):
    """Update a character's editable fields."""
    db = get_db()
    oid = _oid(project_id)

    # Check project access
    proj = await db.projects.find_one({"_id": oid})
    if proj:
        await check_project_access(user, proj)

    # Build $set dict from non-None fields
    update: dict = {}
    for field in ("name", "tier", "description", "arc_summary", "role_in_story", "image_prompt", "image_url", "reference_description"):
        value = getattr(body, field)
        if value is not None:
            update[field] = value

    if body.metadata is not None:
        meta_data = body.metadata.model_dump(exclude_none=True)
        for mk, mv in meta_data.items():
            update[f"metadata.{mk}"] = mv

    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.characters.update_one(
        {"project_id": oid, "id": character_id},
        {"$set": update},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Character not found")

    doc = await db.characters.find_one({"project_id": oid, "id": character_id})
    return _strip_mongo_id(doc)


@router.patch("/projects/{project_id}/scenes/{scene_number}/shots/{shot_number}")
async def update_shot(project_id: str, scene_number: int, shot_number: int, body: dict, user: dict = Depends(get_current_user)):
    """Update shot fields (video_url, etc.)."""
    db = get_db()
    oid = _oid(project_id)

    proj = await db.projects.find_one({"_id": oid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_project_access(user, proj)

    scene_doc = await db.scenes.find_one({"project_id": oid, "scene_number": scene_number})
    if not scene_doc:
        raise HTTPException(status_code=404, detail="Scene not found")

    shots = scene_doc.get("shots", [])
    shot_idx = next((i for i, s in enumerate(shots) if s.get("shot_number") == shot_number), None)
    if shot_idx is None:
        raise HTTPException(status_code=404, detail="Shot not found")

    allowed = {"video_url", "image_url"}
    update = {}
    for field in allowed:
        if field in body:
            original = body[field]
            # Persist Replicate temporary URLs to local storage
            val = await _persist_url(original, project_id, f"shots/s{scene_number}")
            update[f"shots.{shot_idx}.{field}"] = val
            # Keep original remote URL for passing to other Replicate models
            if original and original.startswith("http"):
                update[f"shots.{shot_idx}.{field}_remote"] = original

    if not update:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    await db.scenes.update_one({"_id": scene_doc["_id"]}, {"$set": update})
    return {"ok": True}


@router.patch("/projects/{project_id}/scenes/{scene_number}")
async def update_scene(project_id: str, scene_number: int, body: dict, user: dict = Depends(get_current_user)):
    """Update scene production fields (scene_video_url, voiceover_url, music_url, assembled_url)."""
    db = get_db()
    oid = _oid(project_id)

    proj = await db.projects.find_one({"_id": oid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    await check_project_access(user, proj)

    scene_doc = await db.scenes.find_one({"project_id": oid, "scene_number": scene_number})
    if not scene_doc:
        raise HTTPException(status_code=404, detail="Scene not found")

    allowed = {"scene_video_url", "voiceover_url", "music_url", "assembled_url"}
    update = {}
    for field in allowed:
        if field in body:
            original = body[field]
            val = await _persist_url(original, project_id, f"scenes/s{scene_number}")
            update[field] = val
            if original and original.startswith("http"):
                update[f"{field}_remote"] = original

    if not update:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    await db.scenes.update_one({"_id": scene_doc["_id"]}, {"$set": update})
    return {"ok": True}


@router.delete("/projects/{project_id}", status_code=204)
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    """Delete a project and all related data. Only creator or Admin+."""
    db = get_db()
    oid = _oid(project_id)

    proj = await db.projects.find_one({"_id": oid})
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    await check_project_access(user, proj)

    # Only creator or admin+ can delete
    uid = str(user["_id"])
    org_id = str(proj.get("org_id", ""))
    is_admin = any(m["org_id"] == org_id and m["role"] in ("owner", "admin") for m in user.get("organizations", []))
    if proj.get("created_by") != uid and not is_admin:
        raise HTTPException(status_code=403, detail="Only the creator or an admin can delete this project")

    result = await db.projects.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")

    # Cascade delete all related collections in parallel
    await asyncio.gather(
        db.characters.delete_many({"project_id": oid}),
        db.locations.delete_many({"project_id": oid}),
        db.assets.delete_many({"project_id": oid}),
        db.scenes.delete_many({"project_id": oid}),
    )
