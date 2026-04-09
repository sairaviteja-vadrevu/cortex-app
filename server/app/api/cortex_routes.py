"""Legacy cortex endpoints: JWT auth, Replicate proxy, OpenAI helpers, video merging."""

import re
import json
import asyncio
import httpx
import bcrypt
import jwt as pyjwt
from uuid import uuid4
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..config import settings
from ..db import get_db

router = APIRouter(tags=["cortex"])

security = HTTPBearer()

REPLICATE_API = "https://api.replicate.com/v1"


# ── JWT Auth helpers ──

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_expiry_days),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode_token(token: str) -> dict:
    try:
        return pyjwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_jwt_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = _decode_token(credentials.credentials)
    return payload


# ── JWT Auth endpoints ──

@router.post("/auth/signup")
async def signup(request: Request):
    try:
        body = await request.json()
        name = body.get("name", "").strip()
        email = body.get("email", "").strip().lower()
        password = body.get("password", "")

        if not email or not password:
            raise HTTPException(
                status_code=400, detail="Email and password are required")
        if len(password) < 6:
            raise HTTPException(
                status_code=400, detail="Password must be at least 6 characters")

        db = get_db()
        users_col = db["users"]

        if await users_col.find_one({"email": email}):
            raise HTTPException(
                status_code=409, detail="Email already registered")

        user_id = str(uuid4())
        await users_col.insert_one({
            "_id": user_id,
            "name": name or email.split("@")[0],
            "email": email,
            "password": _hash_password(password),
            "createdAt": datetime.now(timezone.utc).isoformat(),
        })

        token = _create_token(user_id, email)
        return {"token": token, "user": {"id": user_id, "name": name or email.split("@")[0], "email": email}}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Signup error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Signup failed: {str(e)}")


@router.post("/auth/signin")
async def signin(request: Request):
    body = await request.json()
    email = body.get("email", "").strip().lower()
    password = body.get("password", "")

    if not email or not password:
        raise HTTPException(
            status_code=400, detail="Email and password are required")

    db = get_db()
    users_col = db["users"]

    user = await users_col.find_one({"email": email})
    if not user or not _verify_password(password, user["password"]):
        raise HTTPException(
            status_code=401, detail="Invalid email or password")

    token = _create_token(user["_id"], email)
    return {"token": token, "user": {"id": user["_id"], "name": user.get("name", ""), "email": email}}


@router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_jwt_user)):
    db = get_db()
    users_col = db["users"]
    user = await users_col.find_one({"_id": current_user["sub"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user["_id"], "name": user.get("name", ""), "email": user["email"]}


# ── In-memory job store ──

_jobs: dict[str, dict] = {}


# ── Replicate helpers ──

def _rep_headers(wait=True):
    h = {"Authorization": f"Bearer {settings.replicate_key}",
         "Content-Type": "application/json"}
    if wait:
        h["Prefer"] = "wait"
    return h


async def _replicate_run(client, model: str, inp: dict, timeout: int = 300):
    resp = await client.post(
        f"{REPLICATE_API}/models/{model}/predictions",
        headers=_rep_headers(), json={"input": inp}, timeout=timeout,
    )
    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    prediction = resp.json()

    while prediction.get("status") not in ("succeeded", "failed", "canceled"):
        await asyncio.sleep(2)
        poll = await client.get(
            f"{REPLICATE_API}/predictions/{prediction['id']}",
            headers={"Authorization": f"Bearer {settings.replicate_key}"}, timeout=60,
        )
        prediction = poll.json()

    if prediction["status"] == "failed":
        raise HTTPException(status_code=500, detail=prediction.get(
            "error", "Prediction failed"))
    if prediction["status"] == "canceled":
        raise HTTPException(status_code=500, detail="Prediction canceled")
    return prediction.get("output")


# ── Replicate proxy endpoints ─��

@router.post("/predictions")
async def create_prediction(request: Request, _user: dict = Depends(get_jwt_user)):
    body = await request.json()
    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(f"{REPLICATE_API}/predictions", headers=_rep_headers(), json=body)
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()


@router.get("/predictions/{prediction_id}")
async def get_prediction(prediction_id: str, _user: dict = Depends(get_jwt_user)):
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(
            f"{REPLICATE_API}/predictions/{prediction_id}",
            headers={"Authorization": f"Bearer {settings.replicate_key}"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()


@router.post("/models/{owner}/{model}/predictions")
async def create_model_prediction(owner: str, model: str, request: Request, _user: dict = Depends(get_jwt_user)):
    body = await request.json()
    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(
            f"{REPLICATE_API}/models/{owner}/{model}/predictions",
            headers=_rep_headers(), json=body,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        return resp.json()


@router.get("/model-version/{owner}/{model}")
async def get_model_version(owner: str, model: str, _user: dict = Depends(get_jwt_user)):
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{REPLICATE_API}/models/{owner}/{model}",
            headers={"Authorization": f"Bearer {settings.replicate_key}"},
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        data = resp.json()
        version = data.get("latest_version", {}).get("id")
        if not version:
            raise HTTPException(
                status_code=404, detail="No version found for model")
        return {"version": version}


# ── OpenAI helper ──

async def _openai_generate(system_prompt: str, user_prompt: str = "",
                           temperature: float = 0.3, max_tokens: int = 4096,
                           json_mode: bool = False):
    openai_key = settings.openai_api_key
    openai_model = "gpt-4o-mini"

    messages = [{"role": "system", "content": system_prompt}]
    if user_prompt:
        messages.append({"role": "user", "content": user_prompt})

    body = {"model": openai_model, "messages": messages,
            "temperature": temperature, "max_tokens": max_tokens}
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {openai_key}",
                     "Content-Type": "application/json"},
            json=body,
        )
        if resp.status_code >= 400:
            raise HTTPException(status_code=resp.status_code,
                                detail=resp.text[:500])
        data = resp.json()
        text = data.get("choices", [{}])[0].get(
            "message", {}).get("content", "")
        if not text:
            raise HTTPException(
                status_code=500, detail="Empty OpenAI response")
        return text


# ── Screenplay processing (legacy single-pass) ──

PROCESS_SCREENPLAY_SYSTEM = """You are a professional script analyst, art director, and cinematographer. Analyze the screenplay and produce a complete storyboard breakdown.

Return a JSON object with this exact structure:
{
  "styleGuide": "A concise visual style guide (5-8 sentences). Include: art style, color palette, lighting style, era/period, visual motifs.",
  "scenes": [
    {
      "number": 1,
      "heading": "INT. COFFEE SHOP - DAY",
      "title": "Short descriptive title",
      "description": "Rich visual description (5-8 sentences).",
      "scriptExcerpt": "The relevant script text",
      "characters": ["Character Name"],
      "mood": "tense",
      "location": { "name": "Coffee Shop", "interiorExterior": "INT", "timeOfDay": "DAY", "description": "..." },
      "dialogueLines": [{ "character": "Jane", "text": "Line of dialogue.", "direction": "(sotto voce)" }],
      "shots": [
        { "shotNumber": 1, "cameraSize": "wide", "cameraAngle": "eye-level", "cameraMovement": "static", "lighting": "warm daylight", "description": "Establishing shot" }
      ],
      "assets": ["coffee cup", "phone"]
    }
  ],
  "characters": [{ "name": "Jane", "description": "Physical appearance description", "tier": "primary", "scenes": [1, 2] }],
  "locations": [{ "name": "Coffee Shop", "description": "...", "interiorExterior": "INT", "timeOfDay": "DAY", "scenes": [1] }],
  "assets": [{ "name": "Phone", "category": "prop", "description": "...", "scenes": [1, 3] }]
}

Rules:
- Each scene MUST have 2-4 shots with cinematographic details
- cameraSize: extreme-wide|wide|medium|medium-close-up|close-up|extreme-close-up
- cameraAngle: birds-eye|high|eye-level|low|worms-eye|dutch
- cameraMovement: static|pan|tilt|dolly|tracking|crane|handheld|steadicam
- Extract ALL dialogue, locations, props/wardrobe/vehicles as assets
- Character descriptions: VISUAL/PHYSICAL only
- Character tier: primary|secondary|background
- Return ONLY valid JSON"""


async def _run_processing(job_id: str, script: str):
    try:
        text = await _openai_generate(
            PROCESS_SCREENPLAY_SYSTEM,
            f"Here is the screenplay to analyze:\n\n{script[:30000]}",
            temperature=0.3, max_tokens=4096, json_mode=True,
        )
        try:
            result = json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
            if match:
                result = json.loads(match.group(1))
            else:
                _jobs[job_id] = {"status": "error", "result": None,
                                 "error": "Failed to parse AI response"}
                return
        _jobs[job_id] = {"status": "ready", "result": result, "error": None}
    except Exception as e:
        _jobs[job_id] = {"status": "error", "result": None, "error": str(e)}


@router.post("/process-screenplay")
async def process_screenplay(request: Request, background_tasks: BackgroundTasks, _user: dict = Depends(get_jwt_user)):
    body = await request.json()
    script = body.get("script", "")
    if not script.strip():
        raise HTTPException(status_code=400, detail="Script text is required")
    job_id = str(uuid4())
    _jobs[job_id] = {"status": "processing", "result": None, "error": None}
    background_tasks.add_task(_run_processing, job_id, script)
    return {"jobId": job_id, "status": "processing"}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, _user: dict = Depends(get_jwt_user)):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/split-scenes")
async def split_scenes(request: Request, _user: dict = Depends(get_jwt_user)):
    body = await request.json()
    script = body.get("script", "")
    if not script.strip():
        raise HTTPException(status_code=400, detail="Script text is required")
    text = await _openai_generate(
        PROCESS_SCREENPLAY_SYSTEM,
        f"Here is the screenplay to analyze:\n\n{script[:30000]}",
        temperature=0.3, json_mode=True,
    )
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if match:
            return json.loads(match.group(1))
        raise HTTPException(
            status_code=500, detail="Failed to parse response as JSON")


@router.post("/generate-questions")
async def generate_questions(request: Request, _user: dict = Depends(get_jwt_user)):
    body = await request.json()
    user_prompt = body.get("prompt", "")
    intent = body.get("intent", "image")
    intent_label = {"product_video": "product video ad",
                    "photoshoot": "product photoshoot", "video": "video"}.get(intent, "image")
    system = f"""You are a creative director AI. A user wants to create a {intent_label}.
Their request: "{user_prompt}"
Generate exactly 3-4 clarifying questions with 3-4 options each.
Return ONLY valid JSON: [{{"q":"Question?","options":["Opt1","Opt2","Opt3"]}}]"""
    text = await _openai_generate(system, temperature=0.7, max_tokens=800)
    match = re.search(r"\[[\s\S]*\]", text)
    if match:
        return json.loads(match.group(0))
    raise HTTPException(status_code=500, detail="Failed to parse questions")


@router.post("/build-prompt")
async def build_prompt(request: Request, _user: dict = Depends(get_jwt_user)):
    body = await request.json()
    user_prompt = body.get("prompt", "")
    questions = body.get("questions", [])
    answers_text = "\n\n".join(
        f"Q: {q['q']}\nA: {q.get('answer', '')}" for q in questions)
    system = f"""You are a prompt engineer. Create a detailed image/video generation prompt.
User request: "{user_prompt}"
Preferences:
{answers_text}
Generate a single detailed prompt (2-3 sentences). Return ONLY the prompt text."""
    text = await _openai_generate(system, temperature=0.7, max_tokens=400)
    return {"prompt": text.strip()}


# ── Merge endpoints ──

@router.post("/merge-videos")
async def merge_videos(request: Request, _user: dict = Depends(get_jwt_user)):
    body = await request.json()
    video1, video2 = body.get("video1"), body.get("video2")
    if not video1 or not video2:
        raise HTTPException(
            status_code=400, detail="video1 and video2 URLs are required")
    async with httpx.AsyncClient(timeout=600) as client:
        output = await _replicate_run(client, "lucataco/video-merge", {"video1": video1, "video2": video2}, timeout=600)
    return {"output": output}


@router.post("/merge-audio-video")
async def merge_audio_video(request: Request, _user: dict = Depends(get_jwt_user)):
    body = await request.json()
    video_url, audio_url = body.get("video_url"), body.get("audio_url")
    if not video_url or not audio_url:
        raise HTTPException(
            status_code=400, detail="video_url and audio_url are required")
    async with httpx.AsyncClient(timeout=600) as client:
        output = await _replicate_run(client, "lucataco/video-audio-merge", {"video_file": video_url, "audio_file": audio_url}, timeout=600)
    return {"output": output}
