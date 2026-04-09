import logging
from typing import Optional

import jwt as pyjwt
from bson import ObjectId
from fastapi import HTTPException, Request

from .config import settings
from .db import get_db
from .models.storyboard import OrganizationRole, ProjectAccess

logger = logging.getLogger(__name__)

ROLE_HIERARCHY = {
    OrganizationRole.OWNER: 3,
    OrganizationRole.ADMIN: 2,
    OrganizationRole.USER: 1,
}


async def get_current_user(request: Request) -> dict:
    """FastAPI dependency: verify JWT token and return user doc from users."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header[7:]
    try:
        payload = pyjwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    db = get_db()
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Ensure standard fields exist
    if "organizations" not in user:
        user["organizations"] = []
    if "active_org_id" not in user:
        user["active_org_id"] = None

    return user


def _get_user_org_membership(user: dict, org_id: str) -> Optional[dict]:
    """Find a user's membership in an org."""
    for m in user.get("organizations", []):
        if m["org_id"] == org_id:
            return m
    return None


def require_org_access(user: dict, org_id: str) -> None:
    """Raise 403 if user is not a member of the org."""
    if not _get_user_org_membership(user, org_id):
        raise HTTPException(status_code=403, detail="Not a member of this organization")


def require_org_role(user: dict, org_id: str, min_role: OrganizationRole) -> None:
    """Raise 403 if user doesn't have at least min_role in the org."""
    membership = _get_user_org_membership(user, org_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    user_level = ROLE_HIERARCHY.get(OrganizationRole(membership["role"]), 0)
    required_level = ROLE_HIERARCHY.get(min_role, 0)
    if user_level < required_level:
        raise HTTPException(status_code=403, detail="Insufficient role")


async def check_project_access(user: dict, project_doc: dict) -> None:
    """Check if user can access a project based on ownership or org membership."""
    user_id = str(user["_id"])

    # Creator can always access their own project
    if project_doc.get("created_by") == user_id:
        return

    org_id = str(project_doc.get("org_id", ""))
    if not org_id:
        return  # No org restriction

    membership = _get_user_org_membership(user, org_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this organization")

    role = OrganizationRole(membership["role"])
    if role == OrganizationRole.OWNER:
        return

    access = project_doc.get("access", ProjectAccess.ALL_MEMBERS)

    if access == ProjectAccess.ALL_MEMBERS or access == ProjectAccess.ALL_MEMBERS.value:
        return
    elif access == ProjectAccess.PRIVATE or access == ProjectAccess.PRIVATE.value:
        raise HTTPException(status_code=403, detail="This project is private")
    elif access == ProjectAccess.SELECT_USERS or access == ProjectAccess.SELECT_USERS.value:
        allowed = project_doc.get("access_user_ids", [])
        if user_id not in allowed:
            raise HTTPException(status_code=403, detail="You don't have access to this project")
    elif access == ProjectAccess.TEAM or access == ProjectAccess.TEAM.value:
        team_id = project_doc.get("access_team_id")
        if not team_id:
            raise HTTPException(status_code=403, detail="No team configured for this project")
        db = get_db()
        org = await db.organizations.find_one(
            {"_id": ObjectId(org_id), "teams.id": team_id},
            {"teams.$": 1},
        )
        if not org or not org.get("teams"):
            raise HTTPException(status_code=403, detail="Team not found")
        team = org["teams"][0]
        if user_id not in team.get("member_user_ids", []):
            raise HTTPException(status_code=403, detail="You are not a member of the required team")
