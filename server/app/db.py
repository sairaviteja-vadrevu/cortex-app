import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import IndexModel, ASCENDING, DESCENDING

from .config import settings

logger = logging.getLogger(__name__)

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


async def connect_db() -> None:
    """Initialize the MongoDB client and create indexes."""
    global _client, _db
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    _db = _client[settings.mongodb_db]

    # Drop legacy firebase index if it exists
    try:
        await _db.users.drop_index("firebase_uid_1")
        logger.info("Dropped legacy firebase_uid index")
    except Exception as e:
        # Index doesn't exist or already dropped, that's fine
        logger.debug("Could not drop firebase_uid index: %s", str(e))

    # Create indexes
    await _db.projects.create_indexes([
        IndexModel([("created_at", DESCENDING)]),
        IndexModel([("org_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("collection_id", ASCENDING), ("sort_order", ASCENDING)]),
    ])
    await _db.collections.create_indexes([
        IndexModel([("org_id", ASCENDING), ("created_at", DESCENDING)]),
        IndexModel([("collection_type", ASCENDING)]),
    ])
    await _db.users.create_indexes([
        IndexModel([("email", ASCENDING)], unique=True),
    ])
    await _db.invite_codes.create_indexes([
        IndexModel([("code", ASCENDING)], unique=True),
        IndexModel([("expires_at", ASCENDING)]),
    ])
    await _db.characters.create_indexes([
        IndexModel([("project_id", ASCENDING), ("id", ASCENDING)])
    ])
    await _db.locations.create_indexes([
        IndexModel([("project_id", ASCENDING), ("id", ASCENDING)])
    ])
    await _db.assets.create_indexes([
        IndexModel([("project_id", ASCENDING), ("id", ASCENDING)])
    ])
    await _db.scenes.create_indexes([
        IndexModel([("project_id", ASCENDING), ("scene_number", ASCENDING)])
    ])

    # Mark any stuck "processing"/"cancelled" projects as "error" (handles server restart)
    result = await _db.projects.update_many(
        {"status": {"$in": ["processing", "cancelled"]}},
        {"$set": {"status": "error", "error_message": "Server restarted during processing"}}
    )
    if result.modified_count:
        logger.warning("Marked %d stuck processing projects as error", result.modified_count)

    logger.info("Connected to MongoDB at %s, db=%s", settings.mongodb_uri, settings.mongodb_db)


async def close_db() -> None:
    """Close the MongoDB client."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
    logger.info("MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:
    """Return the current database instance."""
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _db
