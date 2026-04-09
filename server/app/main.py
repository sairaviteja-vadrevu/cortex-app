from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import connect_db, close_db

UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(title="Cotex App", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}


# Import and register storyboard routes
from .api.routes import router  # noqa: E402
from .api.auth_routes import router as auth_router  # noqa: E402
from .api.org_routes import router as org_router  # noqa: E402
from .api.collection_routes import router as collection_router  # noqa: E402
from .api.cortex_routes import router as cortex_router  # noqa: E402

app.include_router(router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(org_router, prefix="/api/v1")
app.include_router(collection_router, prefix="/api/v1")

# Legacy cortex endpoints under /api (preserving existing paths)
app.include_router(cortex_router, prefix="/api")

# Serve uploaded reference images
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
