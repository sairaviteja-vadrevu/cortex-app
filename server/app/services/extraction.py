"""Sequential per-scene extraction pipeline.

Flow: Phase 0 (split) → For each scene: [extract entities+metadata → extract shots → callback] → Finalize
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional, Callable, Awaitable

from ..config import settings
from ..models.enums import LLMProvider
from ..models.storyboard import (
    Character, Location, Asset, SceneBreakdown, StoryboardProject,
)
from .llm_client import call_llm, parse_llm_json
from .prompts import (
    build_pass_scene_prompt, build_pass_2_user_prompt,
    PASS_SCENE_SYSTEM, PASS_2_SYSTEM,
)
from .scene_splitter import split_scenes, PreSplitScene
from .pipeline_tracker import PipelineTracker
from .extraction_helpers import (
    _safe_list, _safe_str, _safe_int, _safe_enum,
    _resolve_scene_names, _build_scene_breakdown, _compute_relationships,
    EntityAccumulator,
)

logger = logging.getLogger(__name__)


# ─── Resolve shot names ──────────────────────────────────

def _resolve_shot_names(
    shots_raw: list,
    char_name_to_id: dict[str, str],
    asset_name_to_id: dict[str, str],
) -> list[dict]:
    """Resolve character/asset names to IDs in shot dicts."""
    shots = []
    for shot_raw in shots_raw:
        char_names_in_frame = _safe_list(shot_raw.get("characters_in_frame"))
        char_ids_in_frame = []
        for cn in char_names_in_frame:
            cid = char_name_to_id.get(str(cn).lower(), "")
            char_ids_in_frame.append(cid if cid else cn)

        asset_names_in_frame = _safe_list(shot_raw.get("assets_in_frame"))
        asset_ids_in_frame = []
        for an in asset_names_in_frame:
            aid = asset_name_to_id.get(str(an).lower(), "")
            asset_ids_in_frame.append(aid if aid else an)

        shot_dialogue = []
        for d in _safe_list(shot_raw.get("dialogue")):
            if isinstance(d, str):
                continue
            cn = _safe_str(d.get("character_name"))
            cid = char_name_to_id.get(cn.lower(), f"unresolved_{cn}") if cn else ""
            shot_dialogue.append({
                "character_id": cid,
                "character_name": cn,
                "parenthetical": d.get("parenthetical"),
                "text": _safe_str(d.get("text")),
                "original_language": d.get("original_language"),
            })
        shot_raw["dialogue"] = shot_dialogue
        shot_raw["characters_in_frame"] = char_ids_in_frame
        shot_raw["assets_in_frame"] = asset_ids_in_frame
        shots.append(shot_raw)
    return shots


# ─── Scene context helper ─────────────────────────────────

def _scene_context(
    scene_raw: dict,
    characters: list[Character],
    locations: list[Location],
    assets: list[Asset],
) -> tuple[list[dict], dict | None, list[dict]]:
    """Return (chars, location, assets) dicts for a scene."""
    scene_char_ids = set(_safe_list(scene_raw.get("character_ids")))
    scene_chars = [c.model_dump() for c in characters if c.id in scene_char_ids]

    loc_id = _safe_str(scene_raw.get("location_id"))
    scene_loc = next((l.model_dump() for l in locations if l.id == loc_id), None)

    scene_asset_ids = set(_safe_list(scene_raw.get("asset_ids")))
    scene_assets = [a.model_dump() for a in assets if a.id in scene_asset_ids]

    return scene_chars, scene_loc, scene_assets


# ─── Pass 2: Shot breakdown for a single scene ───────────

async def pass_2_enrich_scene(
    scene_raw: dict,
    characters: list[Character],
    locations: list[Location],
    assets: list[Asset],
    provider: LLMProvider,
    model: str | None,
    genre: str | None,
    aesthetic: str | None,
    duration_minutes: float | None,
    char_name_to_id: dict[str, str],
    asset_name_to_id: dict[str, str],
    tracker: Optional[PipelineTracker] = None,
    total_scenes: int = 1,
    notes: str | None = None,
) -> dict:
    """Generate shot breakdown for a single scene."""
    scene_num = scene_raw.get("scene_number", "?")

    scene_chars, scene_loc, scene_assets = _scene_context(
        scene_raw, characters, locations, assets
    )

    user_prompt = build_pass_2_user_prompt(
        scene=scene_raw,
        characters=scene_chars,
        location=scene_loc,
        assets=scene_assets,
        genre=genre,
        aesthetic=aesthetic,
        duration_minutes=duration_minutes,
        total_scenes=total_scenes,
        notes=notes,
    )

    result = None
    for attempt in range(2):
        try:
            resp = await call_llm(
                provider=provider,
                model=model,
                system_prompt=PASS_2_SYSTEM,
                user_prompt=user_prompt,
                max_tokens=8000,
                timeout=settings.llm_timeout_pass2,
            )
            if tracker:
                await tracker.add_token_usage(resp.input_tokens, resp.output_tokens)
            result = parse_llm_json(resp.text)
            break
        except Exception as e:
            if attempt == 0:
                logger.warning(f"Pass 2 attempt 1 failed for scene {scene_num}: {e}, retrying...")
                await asyncio.sleep(1)
            else:
                logger.error(f"Pass 2 failed for scene {scene_num} after 2 attempts: {e}")
                return {"shots": [], "estimated_duration_seconds": None, "page_eighths": None}

    # Handle wrapped response
    if "scenes" in result:
        scenes_list = _safe_list(result["scenes"])
        if scenes_list:
            result = scenes_list[0]

    # Resolve character/asset names in shots to IDs
    result["shots"] = _resolve_shot_names(
        _safe_list(result.get("shots")), char_name_to_id, asset_name_to_id
    )
    return result


# ─── Attach raw_script_text from pre-split ────────────────

def _attach_raw_script_text_single(
    scene_dict: dict,
    pre_split_scene: PreSplitScene,
    all_pre_split: list[PreSplitScene],
) -> None:
    """Attach raw_script_text from the pre-split scene to the LLM scene dict."""
    has_real_splits = len(all_pre_split) > 1
    is_chunked = has_real_splits and all_pre_split[0].heading.startswith("Section ")

    if not has_real_splits or is_chunked:
        if not scene_dict.get("raw_script_text"):
            scene_dict["raw_script_text"] = pre_split_scene.raw_text
    else:
        scene_dict["raw_script_text"] = pre_split_scene.raw_text


# ─── Per-Scene Extraction ─────────────────────────────────

async def extract_single_scene(
    pre_split_scene: PreSplitScene,
    all_pre_split: list[PreSplitScene],
    accumulator: EntityAccumulator,
    provider: LLMProvider,
    model: str | None,
    genre: str | None,
    aesthetic: str | None,
    duration_minutes: float | None,
    tracker: Optional[PipelineTracker] = None,
    total_scenes: int = 1,
    notes: str | None = None,
    visual_style: str | None = None,
) -> SceneBreakdown:
    """Extract entities + metadata for a single scene, then generate shots."""
    scene_number = pre_split_scene.scene_number

    # Step 1: Call LLM with per-scene prompt
    user_prompt = build_pass_scene_prompt(
        scene=pre_split_scene,
        known_characters=accumulator.get_known_characters_compact(),
        known_locations=accumulator.get_known_locations_compact(),
        known_assets=accumulator.get_known_assets_compact(),
        genre=genre,
        aesthetic=aesthetic,
        duration_minutes=duration_minutes,
        notes=notes,
        visual_style=visual_style,
    )

    raw = None
    for attempt in range(2):
        try:
            resp = await call_llm(
                provider=provider,
                model=model,
                system_prompt=PASS_SCENE_SYSTEM,
                user_prompt=user_prompt,
                max_tokens=16000,
                timeout=settings.llm_timeout_scene,
            )
            if tracker:
                await tracker.add_token_usage(resp.input_tokens, resp.output_tokens)
            raw = parse_llm_json(resp.text)
            break
        except Exception as e:
            if attempt == 0:
                logger.warning(f"Scene {scene_number} extraction attempt 1 failed: {e}, retrying...")
                await asyncio.sleep(1)
            else:
                raise RuntimeError(f"Scene {scene_number} extraction failed after 2 attempts: {e}")

    # Update title/language from first scene
    if scene_number == 1:
        if raw.get("title"):
            accumulator.title = raw["title"]
        if raw.get("detected_language"):
            accumulator.detected_language = raw["detected_language"]

    # Step 2: Merge new entities into accumulator
    for c in _safe_list(raw.get("new_characters")):
        accumulator.add_character(c, scene_number)

    for l in _safe_list(raw.get("new_locations")):
        accumulator.add_location(l, scene_number)

    for a in _safe_list(raw.get("new_assets")):
        accumulator.add_asset(a, scene_number)

    # Step 3: Process scene metadata — resolve names → IDs
    scene_dict = raw.get("scene", {})
    scene_dict["scene_number"] = scene_number  # Enforce correct number

    # Also update scene_ids for known entities referenced in this scene
    accumulator.update_scene_ids_for_known_entities(scene_dict, scene_number)

    # Attach raw script text
    _attach_raw_script_text_single(scene_dict, pre_split_scene, all_pre_split)

    resolved_scene = _resolve_scene_names(
        scene_dict,
        accumulator.char_name_to_id,
        accumulator.loc_name_to_id,
        accumulator.asset_name_to_id,
    )

    # Step 4: Pass 2 — shot breakdown
    p2_result = await pass_2_enrich_scene(
        resolved_scene,
        accumulator.characters,
        accumulator.locations,
        accumulator.assets,
        provider, model, genre, aesthetic, duration_minutes,
        accumulator.char_name_to_id, accumulator.asset_name_to_id,
        tracker=tracker, total_scenes=total_scenes, notes=notes,
    )

    # Step 5: Build SceneBreakdown
    scene_breakdown = _build_scene_breakdown(resolved_scene, p2_result)
    return scene_breakdown


# ─── Full Pipeline ────────────────────────────────────────

# Callback type: called after each scene completes
OnSceneComplete = Callable[
    [int, SceneBreakdown, list[Character], list[Location], list[Asset]],
    Awaitable[None],
]


async def extract_storyboard(
    script_text: str,
    provider: LLMProvider,
    model: str | None,
    genre: str | None = None,
    aesthetic: str | None = None,
    duration_minutes: float | None = None,
    tracker: Optional[PipelineTracker] = None,
    notes: str | None = None,
    visual_style: str | None = None,
    on_scene_complete: Optional[OnSceneComplete] = None,
) -> StoryboardProject:
    """Sequential per-scene extraction pipeline.

    Phase 0 → For each scene: [extract entities+metadata → shots → callback] → Finalize
    """
    # Phase 0: Pre-split script
    if tracker:
        await tracker.start_phase("phase_0", "Splitting script into scenes")
    pre_split_scenes = split_scenes(script_text)
    num_scenes = len(pre_split_scenes)
    logger.info(f"Phase 0: Pre-split found {num_scenes} scene(s)")
    if tracker:
        await tracker.set_scenes_total(num_scenes)
        await tracker.set_cost_projection(len(script_text), num_scenes)
        await tracker.complete_phase("phase_0")

    # Sequential scene processing
    accumulator = EntityAccumulator()
    all_scenes_raw: list[dict] = []
    all_scene_breakdowns: list[SceneBreakdown] = []

    for i, pre_split in enumerate(pre_split_scenes):
        scene_num = pre_split.scene_number
        if tracker:
            await tracker.start_phase(
                f"scene_{scene_num}",
                f"Processing scene {scene_num}/{num_scenes}",
            )

        logger.info(f"Processing scene {scene_num}/{num_scenes}...")
        scene_bd = await extract_single_scene(
            pre_split_scene=pre_split,
            all_pre_split=pre_split_scenes,
            accumulator=accumulator,
            provider=provider,
            model=model,
            genre=genre,
            aesthetic=aesthetic,
            duration_minutes=duration_minutes,
            tracker=tracker,
            total_scenes=num_scenes,
            notes=notes,
            visual_style=visual_style,
        )
        all_scene_breakdowns.append(scene_bd)

        # Keep resolved scene raw for relationship computation
        all_scenes_raw.append({
            "scene_number": scene_bd.scene_number,
            "character_ids": scene_bd.character_ids,
            "location_id": scene_bd.location_id,
            "asset_ids": scene_bd.asset_ids,
        })

        if tracker:
            await tracker.update_scene_progress(i + 1, num_scenes)
            await tracker.complete_phase(f"scene_{scene_num}")

        # Incremental save callback
        if on_scene_complete:
            await on_scene_complete(
                scene_num,
                scene_bd,
                accumulator.characters,
                accumulator.locations,
                accumulator.assets,
            )

    # Finalize: compute relationships
    if tracker:
        await tracker.start_phase("finalizing", "Computing relationships")

    _compute_relationships(accumulator.characters, accumulator.assets, all_scenes_raw)

    # Build cross-reference maps
    char_scene_map = {c.id: c.scene_ids for c in accumulator.characters}
    loc_scene_map = {l.id: l.scene_ids for l in accumulator.locations}
    asset_scene_map = {a.id: a.scene_ids for a in accumulator.assets}

    project = StoryboardProject(
        title=accumulator.title,
        genre=genre,
        aesthetic=aesthetic,
        target_duration_minutes=duration_minutes,
        detected_language=accumulator.detected_language,
        llm_provider=provider,
        llm_model=model or "",
        total_scenes=len(all_scene_breakdowns),
        total_characters=len(accumulator.characters),
        total_locations=len(accumulator.locations),
        total_assets=len(accumulator.assets),
        characters=accumulator.characters,
        locations=accumulator.locations,
        assets=accumulator.assets,
        scenes=all_scene_breakdowns,
        character_scene_map=char_scene_map,
        location_scene_map=loc_scene_map,
        asset_scene_map=asset_scene_map,
    )

    if tracker:
        await tracker.complete_phase("finalizing")
        await tracker.finish()

    logger.info(f"Pipeline complete: {project.total_scenes} scenes, {project.total_characters} characters")
    return project
