"""Cotex App Server — entry point for uvicorn."""

import uvicorn
from app.main import app  # noqa: F401
from app.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
