"""Prompt templates for per-scene extraction and Pass 2 shot breakdown."""
from __future__ import annotations
import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .scene_splitter import PreSplitScene

# ─── Per-Scene Extraction Prompt ──────────────────────────

PASS_SCENE_SYSTEM = """You are a professional script supervisor and production breakdown artist with expertise in international cinema. You analyze a SINGLE scene from a screenplay.

CRITICAL RULES:
1. LANGUAGE: Detect primary language. NEVER translate dialogue — preserve exactly.
2. KNOWN ENTITIES: You are given a list of characters, locations, and assets already discovered in earlier scenes. If an entity in THIS scene matches a known one (same person, same place, same object — including aliases), reuse the EXACT known name. Do NOT create a duplicate.
3. NEW ENTITIES ONLY: Only put genuinely NEW characters, locations, and assets (not seen before) in the new_characters / new_locations / new_assets arrays. If zero new entities are found, return empty arrays.
4. CHARACTER METADATA: For each NEW character, extract structured attributes. If the script explicitly states something, mark those fields as script-sourced. If you INFER something, list that field in ai_inferred_fields.
5. CHARACTERS: Extract ALL new characters including unnamed extras. Classify: primary (main cast), secondary (recurring), tertiary (one-scene named), extra (unnamed).
6. SCENE METADATA: Extract full scene metadata (heading, synopsis, mood, dialogue, etc.) using entity names from both known and new entities.
7. IMAGE PROMPTS: English-language, detailed, optimized for FLUX/Stable Diffusion.

TYPE RULES — follow these EXACTLY:
- Array fields (aliases, personality_traits, ai_inferred_fields, character_names, asset_names, dialogue) MUST be arrays, NEVER null. Use [] for empty.
- String fields MUST be strings, NEVER null for required fields. Use "" for empty.
- Integer fields (scene_number, dialogue_count) MUST be integers, NEVER null.

OUTPUT: ONLY valid JSON. No markdown fences. No preamble. No trailing text."""

PASS_SCENE_USER_TEMPLATE = """Analyze this single scene and extract:
1. Any NEW characters, locations, and assets not already in the known entities list.
2. Full scene metadata.

{genre_line}
{aesthetic_line}
{duration_line}
{visual_style_line}
{notes_line}

KNOWN ENTITIES (reuse these names — do NOT duplicate):
{known_entities}

SCENE {scene_number}:
---
{scene_text}
---

Return JSON:
{{
  "title": "detected or provided title (or null if unknown)",
  "detected_language": "ISO 639-1 code",
  "new_characters": [
    {{
      "name": "PRIMARY name",
      "aliases": ["all other references to this character"],
      "tier": "primary|secondary|tertiary|extra",
      "description": "full text description combining all known attributes",
      "metadata": {{
        "age_range": "30-35 or null",
        "gender": "male/female/non-binary or null",
        "build": "athletic/slim/heavyset or null",
        "ethnicity": "South Asian/East Asian/etc or null",
        "hair": "description or null",
        "eye_color": "color or null",
        "skin_tone": "description or null",
        "clothing_style": "typical outfit description or null",
        "distinguishing_features": "scars, tattoos, etc or null",
        "personality_traits": ["trait1", "trait2"],
        "speaking_style": "how they talk or null",
        "ai_inferred_fields": ["field names that were NOT explicitly in the script"]
      }},
      "arc_summary": "1-2 sentence arc or null",
      "role_in_story": "protagonist/antagonist/mentor/love interest/etc or null",
      "dialogue_count": 5,
      "image_prompt": "Detailed English prompt for AI character image generation"
    }}
  ],
  "new_locations": [
    {{
      "name": "location name",
      "full_description": "detailed visual description",
      "int_ext": "interior|exterior|both|unspecified",
      "setting_type": "apartment|forest|office|etc",
      "mood": "atmosphere",
      "image_prompt": "English prompt for AI location generation"
    }}
  ],
  "new_assets": [
    {{
      "name": "asset name",
      "category": "prop|vehicle|weapon|costume|set_dressing|special_effect|technology|food_drink|document|other",
      "description": "visual description",
      "significance": "why it matters narratively",
      "associated_character_names": ["character names that interact with this"]
    }}
  ],
  "scene": {{
    "scene_number": {scene_number},
    "scene_heading": "original heading or generated equivalent",
    "scene_type": "dialogue|action|suspense|exposition|montage|emotional|confrontation|transition|discovery|climax",
    "location_name": "must match a known or new location name",
    "int_ext": "interior|exterior|both|unspecified",
    "time_of_day": "day|night|dawn|dusk|unspecified",
    "synopsis": "1-3 sentence summary",
    "mood": "emotional tone",
    "character_names": ["must match known or new character names"],
    "asset_names": ["must match known or new asset names"],
    "dialogue": [
      {{
        "character_name": "speaker",
        "parenthetical": "direction or null",
        "text": "ORIGINAL LANGUAGE — DO NOT TRANSLATE",
        "original_language": "ISO code if different from primary, else null"
      }}
    ],
    "action_description": "non-dialogue action summary",
    "vfx_notes": "or null",
    "sfx_notes": "or null",
    "music_notes": "or null",
    "transition_in": "or null",
    "transition_out": "or null"
  }}
}}"""


def build_pass_scene_prompt(
    scene: "PreSplitScene",
    known_characters: list[dict],
    known_locations: list[dict],
    known_assets: list[dict],
    genre: str | None = None,
    aesthetic: str | None = None,
    duration_minutes: float | None = None,
    notes: str | None = None,
    visual_style: str | None = None,
) -> str:
    """Build the user prompt for per-scene entity+metadata extraction."""
    genre_line = f"Genre: {genre}" if genre else "Genre: not specified"
    aesthetic_line = f"Aesthetic: {aesthetic}" if aesthetic else "Aesthetic: not specified"
    duration_line = f"Target Duration: {duration_minutes} minutes" if duration_minutes else "Target Duration: not specified"
    notes_line = f"Director's Notes: {notes}" if notes else ""
    visual_style_line = f"Visual Style: {visual_style} — ALL image_prompt fields MUST describe visuals in this style." if visual_style else ""

    # Build compact known entities context
    known_entities_parts = []
    if known_characters:
        chars_compact = [{"name": c["name"], "aliases": c.get("aliases", []), "id": c["id"]} for c in known_characters]
        known_entities_parts.append(f"Characters: {json.dumps(chars_compact)}")
    else:
        known_entities_parts.append("Characters: []")

    if known_locations:
        locs_compact = [{"name": l["name"], "id": l["id"]} for l in known_locations]
        known_entities_parts.append(f"Locations: {json.dumps(locs_compact)}")
    else:
        known_entities_parts.append("Locations: []")

    if known_assets:
        assets_compact = [{"name": a["name"], "id": a["id"]} for a in known_assets]
        known_entities_parts.append(f"Assets: {json.dumps(assets_compact)}")
    else:
        known_entities_parts.append("Assets: []")

    known_entities = "\n".join(known_entities_parts)

    return PASS_SCENE_USER_TEMPLATE.format(
        genre_line=genre_line,
        aesthetic_line=aesthetic_line,
        duration_line=duration_line,
        visual_style_line=visual_style_line,
        notes_line=notes_line,
        known_entities=known_entities,
        scene_number=scene.scene_number,
        scene_text=scene.raw_text,
    )


# ─── Pass 2: Shot Breakdown ──────────────────────────────

PASS_2_SYSTEM = """You are a cinematographer and storyboard artist. Given one or more scenes with context (genre, aesthetic, characters, location, mood), generate a shot-by-shot breakdown for EACH scene.

When multiple scenes are provided, return a JSON object with a "scenes" array, each containing scene_number, estimated_duration_seconds, page_eighths, and shots. When a single scene is provided, you may return just the single scene object (no wrapping "scenes" array).

CRITICAL: Assign each dialogue line from the scene to the specific shot where it is spoken. Distribute ALL dialogue lines across the shots — every line must appear in exactly one shot. Use the original language text exactly as provided.

CRITICAL: For EVERY shot, include a "rationale" explaining WHY you chose that specific shot size, camera angle, movement, and lighting for THIS scene. Reference:
- The genre (horror → low angles, noir → chiaroscuro, comedy → eye-level wide)
- The mood/emotional beat of the moment
- Character dynamics (power imbalance → low/high angles, intimacy → close-ups)
- Narrative importance (reveals → slow dolly, action → handheld tracking)
- Cinematic conventions that serve the story

The rationale is what makes this a PROFESSIONAL cinematography breakdown, not just random shot assignments.

SHOT DENSITY AND PACING — this is CRITICAL for realistic timing:
- DO NOT just cover dialogue. You MUST also include:
  • ESTABLISHING SHOTS at the start of each scene (wide/extreme wide, 2-5 seconds)
  • REACTION SHOTS after important dialogue lines (2-3 seconds each)
  • CUTAWAY / INSERT shots for props, environment details (1-3 seconds)
  • TRANSITIONAL beats — characters entering/exiting (2-4 seconds)
  • SCENE-CLOSING shots (2-4 seconds)
- A dialogue line takes roughly 1 second per 2-3 words to deliver.

TARGET DURATION ENFORCEMENT — this is the HIGHEST PRIORITY constraint:
- If a "Target Duration" and "Scene Duration Budget" are provided, you MUST respect them.
- The scene's estimated_duration_seconds MUST NOT exceed the Scene Duration Budget.
- If content seems too long for the budget, CUT less important shots (fewer reaction shots, shorter establishing shots, combine beats) to FIT the budget.
- The budget is MORE important than covering every possible shot — a real editor cuts to fit time.
- The estimated_duration_seconds MUST equal the sum of all shot duration_seconds.
- Only if NO target duration is specified, default to typical scene durations (60-180s).

MULTI-STILL ANALYSIS:
For each shot, decide how many key stills (1-4) best represent it:
- 1 still: static shots, simple dialogue coverage, inserts, close-ups
- 2 stills: pan/tilt revealing new info, simple tracking, shot-reverse-shot
- 3 stills: dolly/crane with significant subject change, action beats with clear phases
- 4 stills: complex steadicam/tracking, fight choreography, chase sequences

If still_count is 1, leave "stills" as an empty array and put the prompt in "image_prompt".
If still_count > 1, put null in "image_prompt" and populate the "stills" array.

Also flag shots that should be AI-generated (complex VFX, crowds, elaborate environments, action).

TYPE RULES — follow these EXACTLY:
- Array fields (characters_in_frame, assets_in_frame, shots) MUST be arrays, NEVER null. Use [] for empty.
- String fields (description, rationale) MUST be strings, NEVER null. Use "" for empty.
- Integer fields (shot_number) MUST be integers, NEVER null.
- Boolean fields (ai_scene_suggestion) MUST be true/false, NEVER null.

OUTPUT: ONLY valid JSON. No markdown fences. No preamble. No trailing text."""

PASS_2_USER_TEMPLATE = """Generate a shot-by-shot breakdown for this scene.

PROJECT CONTEXT:
- Genre: {genre}
- Aesthetic: {aesthetic}
- Target Duration: {duration}
{notes_line}

SCENE {scene_number}: {scene_heading}
Synopsis: {synopsis}
Mood: {mood}
{scene_stats}

CHARACTERS IN SCENE:
{character_descriptions}

LOCATION:
{location_description}

ACTION:
{action_description}

DIALOGUE:
{dialogue_lines}

ASSETS/PROPS:
{asset_list}

IMPORTANT: If a Scene Duration Budget is given above, your estimated_duration_seconds MUST NOT exceed it. Cut less important shots to fit. The total of ALL scenes must fit within the Target Duration. If no target duration is specified, estimate realistically (45-75s per page).

Return JSON (wrap in "scenes" array if multiple scenes):
{{
  "scenes": [
    {{
      "scene_number": 1,
      "estimated_duration_seconds": "<SUM of all shot durations — typically 60-180s per scene>",
      "page_eighths": 1.5,
      "shots": [
        {{
          "shot_number": 1,
          "description": "what happens visually",
          "shot_size": "extreme_wide|wide|full|medium_wide|medium|medium_close|close_up|extreme_close_up|insert",
          "camera_angle": "eye_level|low|high|birds_eye|worms_eye|dutch|over_the_shoulder|pov",
          "camera_movement": "static|pan|tilt|dolly|truck|crane|handheld|steadicam|zoom|rack_focus|tracking|aerial",
          "lighting": "high_key|low_key|natural|chiaroscuro|silhouette|backlit|practical|neon|golden_hour|moonlit",
          "duration_seconds": "<realistic duration: 2-8 seconds typical>",
          "characters_in_frame": ["character names"],
          "assets_in_frame": ["asset names"],
          "dialogue": [
            {{
              "character_name": "speaker",
              "parenthetical": "direction or null",
              "text": "ORIGINAL LANGUAGE line — DO NOT TRANSLATE"
            }}
          ],
          "rationale": "WHY this shot style. Reference genre, mood, character dynamics, narrative beat. 2-3 sentences.",
          "still_count": 1,
          "image_prompt": "Detailed English prompt if still_count=1, else null",
          "stills": [
            {{
              "still_number": 1,
              "description": "What this specific moment captures",
              "image_prompt": "Detailed prompt for this moment (only if still_count > 1)"
            }}
          ],
          "ai_scene_suggestion": false,
          "ai_scene_rationale": null
        }}
      ]
    }}
  ]
}}"""


def build_pass_2_user_prompt(
    scene: dict,
    characters: list[dict],
    location: dict | None,
    assets: list[dict],
    genre: str | None,
    aesthetic: str | None,
    duration_minutes: float | None,
    total_scenes: int = 1,
    notes: str | None = None,
) -> str:
    # Build character descriptions with metadata
    char_lines = []
    for c in characters:
        meta = c.get("metadata", {})
        parts = [f"- {c['name']} ({c.get('tier', 'unknown')}): {c.get('description', '')}"]
        if meta.get("age_range"):
            parts.append(f"  Age: {meta['age_range']}")
        if meta.get("build"):
            parts.append(f"  Build: {meta['build']}")
        if meta.get("clothing_style"):
            parts.append(f"  Clothing: {meta['clothing_style']}")
        char_lines.append("\n".join(parts))

    # Build dialogue lines
    dialogue_parts = []
    total_dialogue_words = 0
    for d in scene.get("dialogue", []):
        paren = f" ({d['parenthetical']})" if d.get("parenthetical") else ""
        text = d.get('text', '')
        dialogue_parts.append(f"{d.get('character_name', '???')}{paren}: {text}")
        total_dialogue_words += len(text.split())

    # Compute scene stats for duration estimation
    num_dialogue_lines = len(dialogue_parts)
    action_text = scene.get("action_description", "")
    action_words = len(action_text.split()) if action_text else 0
    est_dialogue_secs = round(total_dialogue_words / 2.5) if total_dialogue_words else 0
    est_dialogue_with_pauses = round(est_dialogue_secs * 1.5) if est_dialogue_secs else 0
    est_action_secs = max(action_words // 5 * 3, 5) if action_words else 0
    est_bookend_secs = 8
    est_total = est_dialogue_with_pauses + est_action_secs + est_bookend_secs

    # Compute per-scene budget from target duration
    budget_line = ""
    if duration_minutes and total_scenes > 0:
        budget_secs = round((duration_minutes * 60) / total_scenes)
        budget_line = f"\n- *** Scene Duration Budget: ~{budget_secs}s — this is your HARD CEILING, do NOT exceed it ***"
        est_total = min(est_total, budget_secs)

    scene_stats = f"""Scene Stats (use for duration estimation):
- Dialogue lines: {num_dialogue_lines} ({total_dialogue_words} words → ~{est_dialogue_secs}s delivery + pauses/reactions → ~{est_dialogue_with_pauses}s)
- Action description: {action_words} words → ~{est_action_secs}s of screen action
- Establishing + closing shots: ~{est_bookend_secs}s
- Estimated scene duration: ~{est_total}s{budget_line}"""

    # Build asset list
    asset_parts = [f"- {a['name']}: {a.get('description', '')}" for a in assets]

    loc_desc = ""
    if location:
        loc_desc = f"{location.get('name', 'Unknown')}: {location.get('full_description', '')} (Mood: {location.get('mood', 'unspecified')})"

    notes_line = f"- Director's Notes: {notes}" if notes else ""

    return PASS_2_USER_TEMPLATE.format(
        genre=genre or "not specified",
        aesthetic=aesthetic or "not specified",
        duration=f"{duration_minutes} minutes ({int(duration_minutes * 60)}s total across {total_scenes} scenes, ~{round(duration_minutes * 60 / total_scenes)}s per scene)" if duration_minutes and total_scenes > 0 else "not specified",
        notes_line=notes_line,
        scene_number=scene.get("scene_number", "?"),
        scene_heading=scene.get("scene_heading", ""),
        synopsis=scene.get("synopsis", ""),
        mood=scene.get("mood", ""),
        scene_stats=scene_stats,
        character_descriptions="\n".join(char_lines) or "None specified",
        location_description=loc_desc or "Not specified",
        action_description=action_text,
        dialogue_lines="\n".join(dialogue_parts) or "No dialogue",
        asset_list="\n".join(asset_parts) or "None",
    )
