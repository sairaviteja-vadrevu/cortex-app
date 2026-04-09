import logging
from fastapi import APIRouter, Depends, Body, HTTPException

from ..auth import get_current_user
from ..db import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return current user profile."""
    return {"id": user["_id"], "name": user.get("name", ""), "email": user.get("email", "")}


@router.put("/me")
async def update_me(
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Update name."""
    db = get_db()
    update = {}
    if "name" in body:
        update["name"] = body["name"]
    if not update:
        return {"id": user["_id"], "name": user.get("name", ""), "email": user.get("email", "")}

    await db.users.update_one({"_id": user["_id"]}, {"$set": update})
    updated = await db.users.find_one({"_id": user["_id"]})
    return {"id": updated["_id"], "name": updated.get("name", ""), "email": updated.get("email", "")}


@router.put("/me/active-org")
async def switch_active_org(
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Switch the user's active organization."""
    org_id = body.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="org_id is required")

    is_member = any(m["org_id"] == org_id for m in user.get("organizations", []))
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    db = get_db()
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"active_org_id": org_id}})
    updated = await db.users.find_one({"_id": user["_id"]})
    return {"id": updated["_id"], "name": updated.get("name", ""), "email": updated.get("email", "")}
