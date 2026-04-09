"""Build entity collages for shot image generation.

Combines multiple entity reference images (characters, assets, locations) into a
single composite image that can be used as a reference for Klein image-to-image.
"""
from __future__ import annotations

import asyncio
import logging
from io import BytesIO
from pathlib import Path
from typing import Sequence

import httpx
from PIL import Image

logger = logging.getLogger(__name__)

# Default output size — 16:9 storyboard frame so Klein mirrors these dimensions
DEFAULT_WIDTH = 1344
DEFAULT_HEIGHT = 768

# Where uploaded entity images live on disk
_UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


async def _download_image(url: str) -> Image.Image | None:
    """Download an image from a URL or read from local uploads path."""
    try:
        # Local uploads path (e.g. /uploads/abc.png)
        if url.startswith("/uploads/"):
            local_path = _UPLOADS_DIR / url.split("/uploads/", 1)[1]
            if local_path.exists():
                return Image.open(local_path).convert("RGB")
            logger.warning(f"Local upload not found: {local_path}")
            return None

        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return Image.open(BytesIO(resp.content)).convert("RGB")
    except Exception:
        logger.warning(f"Failed to download image: {url}", exc_info=True)
        return None


def _fit_image(img: Image.Image, w: int, h: int) -> Image.Image:
    """Resize and center-crop an image to exactly w×h."""
    # Scale so the image covers the target box
    scale = max(w / img.width, h / img.height)
    new_w = int(img.width * scale)
    new_h = int(img.height * scale)
    img = img.resize((new_w, new_h), Image.LANCZOS)
    # Center crop
    left = (new_w - w) // 2
    top = (new_h - h) // 2
    return img.crop((left, top, left + w, top + h))


def _compose_collage(
    images: list[Image.Image],
    width: int = DEFAULT_WIDTH,
    height: int = DEFAULT_HEIGHT,
) -> Image.Image:
    """Arrange 1-N images into a single collage at the target dimensions."""
    n = len(images)
    canvas = Image.new("RGB", (width, height), (30, 30, 30))

    if n == 1:
        canvas.paste(_fit_image(images[0], width, height), (0, 0))

    elif n == 2:
        half_w = width // 2
        canvas.paste(_fit_image(images[0], half_w, height), (0, 0))
        canvas.paste(_fit_image(images[1], width - half_w, height), (half_w, 0))

    elif n == 3:
        # Top: full-width first image (location); bottom: two side-by-side
        top_h = height // 2
        bot_h = height - top_h
        half_w = width // 2
        canvas.paste(_fit_image(images[0], width, top_h), (0, 0))
        canvas.paste(_fit_image(images[1], half_w, bot_h), (0, top_h))
        canvas.paste(_fit_image(images[2], width - half_w, bot_h), (half_w, top_h))

    else:
        # Grid: 2 columns, as many rows as needed
        cols = 2
        rows = (n + cols - 1) // cols
        cell_w = width // cols
        cell_h = height // rows
        for idx, img in enumerate(images):
            r, c = divmod(idx, cols)
            x = c * cell_w
            y = r * cell_h
            # Last row may have a single image — stretch to full width
            cw = width if (idx == n - 1 and n % 2 == 1) else cell_w
            canvas.paste(_fit_image(img, cw, cell_h), (x, y))

    return canvas


async def build_entity_collage(
    image_urls: Sequence[str],
    output_path: Path,
    *,
    target_width: int = DEFAULT_WIDTH,
    target_height: int = DEFAULT_HEIGHT,
) -> Path | None:
    """Download entity images and compose them into a single collage.

    Returns the output path on success, or None if no images could be downloaded.
    """
    tasks = [_download_image(url) for url in image_urls]
    results = await asyncio.gather(*tasks)
    images = [img for img in results if img is not None]

    if not images:
        return None

    collage = _compose_collage(images, target_width, target_height)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    collage.save(str(output_path), "JPEG", quality=90)
    logger.info(f"Built entity collage ({len(images)} images) → {output_path}")
    return output_path
