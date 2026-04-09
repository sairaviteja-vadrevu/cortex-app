import asyncio
import logging
from datetime import datetime
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from ..db import get_db
from ..auth import get_current_user
from ..models.storyboard import (
    Collection, CollectionSummary, CollectionType, SeasonInfo,
    ProjectAccess, ProjectSummary, ProjectType,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Request / Response Models ────────────────────────────

class CollectionCreateRequest(BaseModel):
    title: str
    collection_type: CollectionType
    genre: Optional[str] = None
    aesthetic: Optional[str] = None
    description: Optional[str] = None
    seasons: list[SeasonInfo] = []
    access: ProjectAccess = ProjectAccess.ALL_MEMBERS
    access_team_id: Optional[str] = None
    access_user_ids: list[str] = []


class CollectionUpdateRequest(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    aesthetic: Optional[str] = None
    description: Optional[str] = None
    seasons: Optional[list[SeasonInfo]] = None
    access: Optional[ProjectAccess] = None
    access_team_id: Optional[str] = None
    access_user_ids: Optional[list[str]] = None


# ─── Helpers ──────────────────────────────────────────────

def _col_oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=404, detail="Collection not found")


# ─── CRUD ─────────────────────────────────────────────────

@router.post("/collections", response_model=Collection)
async def create_collection(body: CollectionCreateRequest, user: dict = Depends(get_current_user)):
    """Create a new collection (franchise or series)."""
    raise HTTPException(status_code=400, detail="Collections (franchises & series) are coming soon")
    db = get_db()
    org_id = user.get("active_org_id", "")
    user_id = str(user["_id"])

    col_oid = ObjectId()
    collection_id = f"col_{uuid4().hex[:8]}"

    doc = {
        "_id": col_oid,
        "collection_id": collection_id,
        "title": body.title,
        "collection_type": body.collection_type.value,
        "genre": body.genre,
        "aesthetic": body.aesthetic,
        "description": body.description,
        "seasons": [s.model_dump() for s in body.seasons],
        "org_id": org_id,
        "access": body.access.value,
        "access_team_id": body.access_team_id,
        "access_user_ids": body.access_user_ids,
        "created_by": user_id,
        "created_at": datetime.utcnow().isoformat(),
    }

    await db.collections.insert_one(doc)

    return Collection(
        collection_id=collection_id,
        title=body.title,
        collection_type=body.collection_type,
        genre=body.genre,
        aesthetic=body.aesthetic,
        description=body.description,
        seasons=body.seasons,
        org_id=org_id,
        access=body.access,
        access_team_id=body.access_team_id,
        access_user_ids=body.access_user_ids,
        created_by=user_id,
        created_at=doc["created_at"],
    )


@router.get("/collections", response_model=list[CollectionSummary])
async def list_collections(user: dict = Depends(get_current_user)):
    """List collections for the user's active org."""
    db = get_db()
    active_org_id = user.get("active_org_id", "")
    user_id = str(user["_id"])

    query: dict = {"org_id": active_org_id} if active_org_id else {}
    docs = await db.collections.find(query).sort("created_at", -1).to_list(length=None)

    # Get project counts per collection
    collection_ids = [d["collection_id"] for d in docs]
    project_counts: dict[str, int] = {}
    if collection_ids:
        pipeline = [
            {"$match": {"collection_id": {"$in": collection_ids}}},
            {"$group": {"_id": "$collection_id", "count": {"$sum": 1}}},
        ]
        async for agg in db.projects.aggregate(pipeline):
            project_counts[agg["_id"]] = agg["count"]

    results = []
    for doc in docs:
        # Basic access filtering — creators and org owners see all
        if doc.get("created_by") != user_id:
            access = doc.get("access", "all_members")
            if access == "private":
                continue

        col_id = doc["collection_id"]
        seasons = doc.get("seasons", [])
        results.append(CollectionSummary(
            collection_id=col_id,
            title=doc["title"],
            collection_type=doc["collection_type"],
            genre=doc.get("genre"),
            aesthetic=doc.get("aesthetic"),
            project_count=project_counts.get(col_id, 0),
            season_count=len(seasons),
            created_at=doc["created_at"],
            org_id=str(doc.get("org_id", "")),
            created_by=doc.get("created_by", ""),
        ))

    return results


@router.get("/collections/{collection_id}", response_model=Collection)
async def get_collection(collection_id: str, user: dict = Depends(get_current_user)):
    """Get a collection by its collection_id."""
    db = get_db()
    doc = await db.collections.find_one({"collection_id": collection_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Collection not found")

    return Collection(
        collection_id=doc["collection_id"],
        title=doc["title"],
        collection_type=doc["collection_type"],
        genre=doc.get("genre"),
        aesthetic=doc.get("aesthetic"),
        description=doc.get("description"),
        seasons=[SeasonInfo(**s) for s in doc.get("seasons", [])],
        org_id=str(doc.get("org_id", "")),
        access=doc.get("access", "all_members"),
        access_team_id=doc.get("access_team_id"),
        access_user_ids=doc.get("access_user_ids", []),
        created_by=doc.get("created_by", ""),
        created_at=doc["created_at"],
    )


@router.patch("/collections/{collection_id}", response_model=Collection)
async def update_collection(collection_id: str, body: CollectionUpdateRequest, user: dict = Depends(get_current_user)):
    """Update a collection's metadata."""
    db = get_db()
    doc = await db.collections.find_one({"collection_id": collection_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Auth: only creator or admin+
    user_id = str(user["_id"])
    is_creator = doc.get("created_by") == user_id
    org_id = str(doc.get("org_id", ""))
    is_admin = any(
        m["org_id"] == org_id and m["role"] in ("owner", "admin")
        for m in user.get("organizations", [])
    )
    if not is_creator and not is_admin:
        raise HTTPException(status_code=403, detail="Only the creator or an admin can update this collection")

    update: dict = {}
    if body.title is not None:
        update["title"] = body.title
    if body.genre is not None:
        update["genre"] = body.genre
    if body.aesthetic is not None:
        update["aesthetic"] = body.aesthetic
    if body.description is not None:
        update["description"] = body.description
    if body.seasons is not None:
        update["seasons"] = [s.model_dump() for s in body.seasons]
    if body.access is not None:
        update["access"] = body.access.value
    if body.access_team_id is not None:
        update["access_team_id"] = body.access_team_id
    if body.access_user_ids is not None:
        update["access_user_ids"] = body.access_user_ids

    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")

    await db.collections.update_one({"collection_id": collection_id}, {"$set": update})
    return await get_collection(collection_id, user)


@router.delete("/collections/{collection_id}", status_code=204)
async def delete_collection(collection_id: str, user: dict = Depends(get_current_user)):
    """Delete a collection. Child projects become standalone."""
    db = get_db()
    doc = await db.collections.find_one({"collection_id": collection_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Auth: only creator or admin+
    user_id = str(user["_id"])
    is_creator = doc.get("created_by") == user_id
    org_id = str(doc.get("org_id", ""))
    is_admin = any(
        m["org_id"] == org_id and m["role"] in ("owner", "admin")
        for m in user.get("organizations", [])
    )
    if not is_creator and not is_admin:
        raise HTTPException(status_code=403, detail="Only the creator or an admin can delete this collection")

    # Detach child projects — make them standalone
    await db.projects.update_many(
        {"collection_id": collection_id},
        {"$set": {
            "collection_id": None,
            "project_type": ProjectType.STANDALONE.value,
            "sort_order": 0,
            "season_number": None,
            "episode_number": None,
        }},
    )

    await db.collections.delete_one({"collection_id": collection_id})


@router.get("/collections/{collection_id}/projects", response_model=list[ProjectSummary])
async def list_collection_projects(collection_id: str, user: dict = Depends(get_current_user)):
    """List projects in a collection, ordered by sort_order."""
    db = get_db()

    # Verify collection exists
    col = await db.collections.find_one({"collection_id": collection_id})
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

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

    docs = await db.projects.find(
        {"collection_id": collection_id}, projection
    ).sort("sort_order", 1).to_list(length=None)

    return [
        ProjectSummary(
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
        )
        for doc in docs
    ]


def _strip_mongo_id(doc: dict) -> dict:
    doc.pop("_id", None)
    doc.pop("project_id", None)
    return doc


@router.get("/collections/{collection_id}/entities")
async def get_collection_entities(collection_id: str, user: dict = Depends(get_current_user)):
    """Aggregate characters, locations, and assets across all projects in a collection."""
    db = get_db()

    col = await db.collections.find_one({"collection_id": collection_id})
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Get all project OIDs in this collection
    proj_docs = await db.projects.find(
        {"collection_id": collection_id, "status": "ready"},
        {"_id": 1, "title": 1},
    ).to_list(length=None)

    if not proj_docs:
        return {"characters": [], "locations": [], "assets": [], "project_titles": {}}

    proj_oids = [d["_id"] for d in proj_docs]
    project_titles = {str(d["_id"]): d["title"] for d in proj_docs}

    # Fetch all entities in parallel
    chars_fut = db.characters.find({"project_id": {"$in": proj_oids}}).to_list(length=None)
    locs_fut = db.locations.find({"project_id": {"$in": proj_oids}}).to_list(length=None)
    assets_fut = db.assets.find({"project_id": {"$in": proj_oids}}).to_list(length=None)

    chars, locs, assets = await asyncio.gather(chars_fut, locs_fut, assets_fut)

    # Add project_id as string and strip mongo fields
    for c in chars:
        c["_project_id"] = str(c["project_id"])
        _strip_mongo_id(c)
    for l in locs:
        l["_project_id"] = str(l["project_id"])
        _strip_mongo_id(l)
    for a in assets:
        a["_project_id"] = str(a["project_id"])
        _strip_mongo_id(a)

    return {
        "characters": chars,
        "locations": locs,
        "assets": assets,
        "project_titles": project_titles,
    }
