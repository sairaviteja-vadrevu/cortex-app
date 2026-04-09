import logging
import secrets
from datetime import datetime, timedelta
from uuid import uuid4

from bson import ObjectId
from fastapi import APIRouter, Depends, Body, HTTPException

from ..auth import get_current_user, require_org_access, require_org_role
from ..db import get_db
from ..models.storyboard import OrganizationRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.post("")
async def create_organization(
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Create a new organization. Creator becomes Owner."""
    db = get_db()
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Organization name is required")

    org_oid = ObjectId()
    org_id = str(org_oid)
    org_doc = {
        "_id": org_oid,
        "name": name,
        "url": body.get("url", ""),
        "image": body.get("image", "/default-org.svg"),
        "teams": [],
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.organizations.insert_one(org_doc)

    # Add membership to user
    membership = {"org_id": org_id, "role": OrganizationRole.OWNER.value}
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$push": {"organizations": membership},
            "$set": {"active_org_id": org_id},
        },
    )

    org_doc["_id"] = org_id
    return org_doc


@router.get("")
async def list_organizations(user: dict = Depends(get_current_user)):
    """List all organizations the user belongs to."""
    db = get_db()
    org_ids = [ObjectId(m["org_id"]) for m in user.get("organizations", [])]
    if not org_ids:
        return []
    docs = await db.organizations.find({"_id": {"$in": org_ids}}).to_list(length=None)
    for doc in docs:
        doc["_id"] = str(doc["_id"])
    return docs


@router.get("/{org_id}")
async def get_organization(org_id: str, user: dict = Depends(get_current_user)):
    """Get org details including members."""
    require_org_access(user, org_id)
    db = get_db()

    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Get all members
    members = await db.users.find(
        {"organizations.org_id": org_id},
        {"email": 1, "name": 1, "organizations": 1},
    ).to_list(length=None)

    member_list = []
    for m in members:
        role = "user"
        for org_mem in m.get("organizations", []):
            if org_mem["org_id"] == org_id:
                role = org_mem["role"]
                break
        member_list.append({
            "user_id": str(m["_id"]),
            "email": m.get("email", ""),
            "name": m.get("name", ""),
            "role": role,
        })

    org["_id"] = str(org["_id"])
    org["members"] = member_list
    return org


@router.post("/join")
async def join_organization(
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Join an organization via a single-use, time-limited invite code."""
    db = get_db()
    invite_code = body.get("invite_code", "").strip()
    if not invite_code:
        raise HTTPException(status_code=400, detail="Invite code is required")

    # Find and mark the invite code as used atomically
    now = datetime.utcnow().isoformat()
    code_doc = await db.invite_codes.find_one_and_update(
        {
            "code": invite_code,
            "used": False,
            "expires_at": {"$gt": now},
        },
        {"$set": {
            "used": True,
            "used_by": str(user["_id"]),
            "used_at": now,
        }},
    )
    if not code_doc:
        raise HTTPException(status_code=404, detail="Invalid or expired invite code")

    org_id = code_doc["org_id"]

    # Verify org exists
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check if already a member
    if any(m["org_id"] == org_id for m in user.get("organizations", [])):
        raise HTTPException(status_code=400, detail="Already a member of this organization")

    membership = {"org_id": org_id, "role": OrganizationRole.USER.value}
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$push": {"organizations": membership},
            "$set": {"active_org_id": org_id},
        },
    )

    org["_id"] = str(org["_id"])
    return org


@router.post("/{org_id}/invite-code")
async def generate_invite_code(
    org_id: str,
    body: dict = Body(default={}),
    user: dict = Depends(get_current_user),
):
    """Generate a single-use invite code (Admin+). Old codes stay valid."""
    require_org_role(user, org_id, OrganizationRole.ADMIN)
    db = get_db()

    ttl_minutes = body.get("ttl_minutes", 5)
    if ttl_minutes not in (5, 10, 15, 30, 60):
        ttl_minutes = 5

    code = secrets.token_urlsafe(18)[:24]
    expires_at = (datetime.utcnow() + timedelta(minutes=ttl_minutes)).isoformat()

    await db.invite_codes.insert_one({
        "code": code,
        "org_id": org_id,
        "created_by": str(user["_id"]),
        "used": False,
        "expires_at": expires_at,
        "created_at": datetime.utcnow().isoformat(),
    })

    return {"invite_code": code, "expires_at": expires_at, "ttl_minutes": ttl_minutes}


@router.post("/{org_id}/members/{member_user_id}/role")
async def change_member_role(
    org_id: str,
    member_user_id: str,
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Change a member's role (Admin+ for users, Owner for admins)."""
    new_role = body.get("role")
    try:
        new_role_enum = OrganizationRole(new_role)
    except (ValueError, KeyError):
        raise HTTPException(status_code=400, detail="Invalid role")

    # If promoting to admin or owner, require owner
    if new_role_enum in (OrganizationRole.ADMIN, OrganizationRole.OWNER):
        require_org_role(user, org_id, OrganizationRole.OWNER)
    else:
        require_org_role(user, org_id, OrganizationRole.ADMIN)

    db = get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(member_user_id), "organizations.org_id": org_id},
        {"$set": {"organizations.$.role": new_role_enum.value}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found in organization")

    return {"status": "ok"}


@router.delete("/{org_id}/members/{member_user_id}")
async def remove_member(
    org_id: str,
    member_user_id: str,
    user: dict = Depends(get_current_user),
):
    """Remove a member (Admin+, cannot remove Owner)."""
    require_org_role(user, org_id, OrganizationRole.ADMIN)
    db = get_db()

    # Check target's role — cannot remove owner
    target = await db.users.find_one({"_id": ObjectId(member_user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    for m in target.get("organizations", []):
        if m["org_id"] == org_id and m["role"] == OrganizationRole.OWNER.value:
            raise HTTPException(status_code=403, detail="Cannot remove the organization owner")

    await db.users.update_one(
        {"_id": ObjectId(member_user_id)},
        {"$pull": {"organizations": {"org_id": org_id}}},
    )

    # If this was their active org, clear it
    if target.get("active_org_id") == org_id:
        await db.users.update_one(
            {"_id": ObjectId(member_user_id)},
            {"$set": {"active_org_id": None}},
        )

    return {"status": "ok"}


@router.post("/{org_id}/teams")
async def create_team(
    org_id: str,
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Create a team (Admin+)."""
    require_org_role(user, org_id, OrganizationRole.ADMIN)
    db = get_db()

    team = {
        "id": f"team_{uuid4().hex[:8]}",
        "name": body.get("name", "").strip(),
        "member_user_ids": body.get("member_user_ids", []),
    }
    if not team["name"]:
        raise HTTPException(status_code=400, detail="Team name is required")

    await db.organizations.update_one(
        {"_id": ObjectId(org_id)},
        {"$push": {"teams": team}},
    )
    return team


@router.patch("/{org_id}/teams/{team_id}")
async def update_team(
    org_id: str,
    team_id: str,
    body: dict = Body(...),
    user: dict = Depends(get_current_user),
):
    """Update team name/members (Admin+)."""
    require_org_role(user, org_id, OrganizationRole.ADMIN)
    db = get_db()

    update_fields = {}
    if "name" in body:
        update_fields["teams.$.name"] = body["name"]
    if "member_user_ids" in body:
        update_fields["teams.$.member_user_ids"] = body["member_user_ids"]

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db.organizations.update_one(
        {"_id": ObjectId(org_id), "teams.id": team_id},
        {"$set": update_fields},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")

    return {"status": "ok"}


@router.delete("/{org_id}/teams/{team_id}")
async def delete_team(
    org_id: str,
    team_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a team (Admin+)."""
    require_org_role(user, org_id, OrganizationRole.ADMIN)
    db = get_db()

    await db.organizations.update_one(
        {"_id": ObjectId(org_id)},
        {"$pull": {"teams": {"id": team_id}}},
    )
    return {"status": "ok"}
