"""Helper functions for the FLUX Klein image generation API.

See docs/flux-klein-api.md for full API reference.
"""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Optional, Literal

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://platform.indianetailer.in/v1/inference"
POLL_INTERVAL = 2  # seconds between status checks
MAX_POLL_ATTEMPTS = 150  # 5 minutes at 2s intervals

Model = Literal["flux-klein-4b", "flux-klein-9b"]
Precision = Literal["default", "distilled"]


class KleinError(Exception):
    """Raised when a Klein API call fails."""

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _get_api_key() -> str:
    key = settings.klein_api_key
    if not key:
        raise KleinError("KLEIN_API_KEY not configured")
    return key


def _headers() -> dict[str, str]:
    return {
        "X-Api-Key": _get_api_key(),
        "Content-Type": "application/json",
    }


# ─── Text to Image ───────────────────────────────────────

async def text_to_image(
    prompt: str,
    *,
    model: Model = "flux-klein-4b",
    precision: Precision = "default",
    width: int = 1024,
    height: int = 1024,
    negative_prompt: str = "",
    num_inference_steps: int | None = None,
    guidance_scale: float | None = None,
    seed: int | None = None,
    webhook_url: str | None = None,
    priority: int | None = None,
) -> dict:
    """Submit a text-to-image generation job. Returns the raw API response with job_id."""
    payload: dict = {
        "pipeline": "text_to_image",
        "model": model,
        "precision": precision,
        "prompt": prompt,
        "width": width,
        "height": height,
    }
    if negative_prompt:
        payload["negative_prompt"] = negative_prompt
    if num_inference_steps is not None:
        payload["num_inference_steps"] = num_inference_steps
    if guidance_scale is not None:
        payload["guidance_scale"] = guidance_scale
    if seed is not None:
        payload["seed"] = seed
    if webhook_url:
        payload["webhook_url"] = webhook_url
    if priority is not None:
        payload["priority"] = priority

    return await _post_json(payload)


# ─── Image to Image (URL) ────────────────────────────────

async def image_to_image_url(
    prompt: str,
    image_url: str,
    *,
    image_url_2: str | None = None,
    model: Model = "flux-klein-4b",
    precision: Precision = "default",
    negative_prompt: str = "",
    num_inference_steps: int | None = None,
    guidance_scale: float | None = None,
    seed: int | None = None,
    webhook_url: str | None = None,
    priority: int | None = None,
) -> dict:
    """Submit an image-to-image job using image URLs.

    For style transfer, pass image_url as the style reference
    and image_url_2 as the main subject.
    """
    payload: dict = {
        "pipeline": "image_to_image",
        "model": model,
        "precision": precision,
        "prompt": prompt,
        "image_url": image_url,
    }
    if image_url_2:
        payload["image_url_2"] = image_url_2
    if negative_prompt:
        payload["negative_prompt"] = negative_prompt
    if num_inference_steps is not None:
        payload["num_inference_steps"] = num_inference_steps
    if guidance_scale is not None:
        payload["guidance_scale"] = guidance_scale
    if seed is not None:
        payload["seed"] = seed
    if webhook_url:
        payload["webhook_url"] = webhook_url
    if priority is not None:
        payload["priority"] = priority

    return await _post_json(payload)


# ─── Image to Image (File Upload) ────────────────────────

async def image_to_image_upload(
    prompt: str,
    file_path: str | Path,
    *,
    background_file_path: str | Path | None = None,
    model: Model = "flux-klein-4b",
    precision: Precision = "default",
    negative_prompt: str = "",
    webhook_url: str | None = None,
    priority: int | None = None,
) -> dict:
    """Submit an image-to-image job using file uploads.

    For style transfer, file_path is the style reference
    and background_file_path is the main subject.
    """
    file_path = Path(file_path)
    files: dict = {
        "file": (file_path.name, file_path.read_bytes()),
    }
    if background_file_path:
        bg = Path(background_file_path)
        files["background_file"] = (bg.name, bg.read_bytes())

    data: dict = {
        "pipeline": "image_to_image",
        "model": model,
        "precision": precision,
        "prompt": prompt,
    }
    if negative_prompt:
        data["negative_prompt"] = negative_prompt
    if webhook_url:
        data["webhook_url"] = webhook_url
    if priority is not None:
        data["priority"] = str(priority)

    return await _post_upload(files, data)


# ─── Job Status ───────────────────────────────────────────

async def get_job_status(job_id: str) -> dict:
    """Check the status of a generation job."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{BASE_URL}/{job_id}",
            headers={"X-Api-Key": _get_api_key()},
        )
        if resp.status_code != 200:
            raise KleinError(f"Status check failed: {resp.text}", resp.status_code)
        return resp.json()


async def wait_for_result(job_id: str) -> dict:
    """Poll until the job completes or fails. Returns the final status response."""
    for _ in range(MAX_POLL_ATTEMPTS):
        status = await get_job_status(job_id)
        state = status.get("status", "")
        if state == "completed":
            return status
        if state == "failed":
            raise KleinError(f"Job {job_id} failed: {status}")
        await asyncio.sleep(POLL_INTERVAL)
    raise KleinError(f"Job {job_id} timed out after {MAX_POLL_ATTEMPTS * POLL_INTERVAL}s")


# ─── Convenience: generate and wait ──────────────────────

async def generate_image(
    prompt: str,
    *,
    model: Model = "flux-klein-4b",
    precision: Precision = "default",
    width: int = 1024,
    height: int = 1024,
    seed: int | None = None,
) -> str:
    """Submit a text-to-image job and wait for the result URL."""
    resp = await text_to_image(
        prompt, model=model, precision=precision,
        width=width, height=height, seed=seed,
    )
    job_id = resp["job_id"]
    logger.info(f"Klein job {job_id} submitted, waiting for result...")
    result = await wait_for_result(job_id)
    return result["result_url"]


async def transform_image(
    prompt: str,
    image_url: str,
    *,
    model: Model = "flux-klein-4b",
    precision: Precision = "default",
) -> str:
    """Submit an image-to-image job via URL and wait for the result URL."""
    resp = await image_to_image_url(
        prompt, image_url, model=model, precision=precision,
    )
    job_id = resp["job_id"]
    logger.info(f"Klein job {job_id} submitted, waiting for result...")
    result = await wait_for_result(job_id)
    return result["result_url"]


async def style_transfer(
    prompt: str,
    style_image_url: str,
    subject_image_url: str,
    *,
    model: Model = "flux-klein-4b",
    precision: Precision = "distilled",
) -> str:
    """Submit a dual-image style transfer job and wait for the result URL."""
    resp = await image_to_image_url(
        prompt, style_image_url,
        image_url_2=subject_image_url,
        model=model, precision=precision,
    )
    job_id = resp["job_id"]
    logger.info(f"Klein style transfer job {job_id} submitted, waiting for result...")
    result = await wait_for_result(job_id)
    return result["result_url"]


# ─── Internal helpers ─────────────────────────────────────

async def _post_json(payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(BASE_URL, headers=_headers(), json=payload)
        if resp.status_code != 200:
            raise KleinError(f"API error: {resp.text}", resp.status_code)
        return resp.json()


async def _post_upload(files: dict, data: dict) -> dict:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{BASE_URL}/upload",
            headers={"X-Api-Key": _get_api_key()},
            files=files,
            data=data,
        )
        if resp.status_code != 200:
            raise KleinError(f"Upload API error: {resp.text}", resp.status_code)
        return resp.json()
