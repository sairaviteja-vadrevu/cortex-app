"""Extraction helper utilities: type-safety coercers, entity assembly, and EntityAccumulator.

Split from extraction.py for maintainability.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from ..models.enums import InteriorExterior, TimeOfDay, AssetCategory, CharacterTier, SceneType
from ..models.storyboard import (
    Character, CharacterMetadata, CharacterRelationships,
    Location, Asset, DialogueLine, ShotSuggestion, ShotStill, SceneBreakdown,
    ShotSize, CameraAngle, CameraMovement, LightingStyle,
)

logger = logging.getLogger(__name__)


# ─── Type-safety helpers ──────────────────────────────────

def _safe_list(val) -> list:
    """Coerce None to []."""
    return val if isinstance(val, list) else []


def _safe_str(val, default: str = "") -> str:
    """Coerce None / list to default string."""
    if isinstance(val, str):
        return val
    if isinstance(val, list):
        return ", ".join(str(v) for v in val) if val else default
    return default


def _safe_opt_str(val) -> str | None:
    if isinstance(val, str):
        return val
    if isinstance(val, list):
        return ", ".join(str(v) for v in val) if val else None
    return None


def _safe_int(val, default: int = 0) -> int:
    if isinstance(val, int):
        return val
    if isinstance(val, (float, str)):
        try:
            return int(val)
        except (ValueError, TypeError):
            pass
    return default


def _safe_enum(enum_cls, value, default):
    if value is None:
        return default
    try:
        return enum_cls(value.lower().strip())
    except (ValueError, AttributeError):
        return default


# ─── Entity Assembly Helpers ──────────────────────────────

def _assemble_character(raw: dict, char_id: str) -> Character:
    """Build a Character model from raw LLM output."""
    name = _safe_str(raw.get("name"), f"Character {char_id}")
    meta_raw = raw.get("metadata") or {}
    metadata = CharacterMetadata(
        age_range=_safe_opt_str(meta_raw.get("age_range")),
        gender=_safe_opt_str(meta_raw.get("gender")),
        build=_safe_opt_str(meta_raw.get("build")),
        ethnicity=_safe_opt_str(meta_raw.get("ethnicity")),
        hair=_safe_opt_str(meta_raw.get("hair")),
        eye_color=_safe_opt_str(meta_raw.get("eye_color")),
        skin_tone=_safe_opt_str(meta_raw.get("skin_tone")),
        clothing_style=_safe_opt_str(meta_raw.get("clothing_style")),
        distinguishing_features=_safe_opt_str(meta_raw.get("distinguishing_features")),
        personality_traits=_safe_list(meta_raw.get("personality_traits")),
        speaking_style=_safe_opt_str(meta_raw.get("speaking_style")),
        ai_inferred_fields=_safe_list(meta_raw.get("ai_inferred_fields")),
    )
    return Character(
        id=char_id,
        name=name,
        aliases=_safe_list(raw.get("aliases")),
        tier=_safe_enum(CharacterTier, raw.get("tier"), CharacterTier.EXTRA),
        description=_safe_str(raw.get("description")),
        metadata=metadata,
        arc_summary=raw.get("arc_summary"),
        role_in_story=raw.get("role_in_story"),
        first_appearance_scene=raw.get("first_appearance_scene"),
        scene_ids=[],
        dialogue_count=_safe_int(raw.get("dialogue_count")),
        image_prompt=raw.get("image_prompt"),
    )


def _assemble_location(raw: dict, loc_id: str) -> Location:
    """Build a Location model from raw LLM output."""
    name = _safe_str(raw.get("name"), f"Location {loc_id}")
    return Location(
        id=loc_id,
        name=name,
        full_description=_safe_str(raw.get("full_description")),
        int_ext=_safe_enum(InteriorExterior, raw.get("int_ext"), InteriorExterior.UNSPECIFIED),
        setting_type=_safe_str(raw.get("setting_type"), "unknown"),
        mood=raw.get("mood"),
        scene_ids=[],
        image_prompt=raw.get("image_prompt"),
    )


def _assemble_asset(raw: dict, asset_id: str, char_name_to_id: dict[str, str]) -> Asset:
    """Build an Asset model from raw LLM output."""
    name = _safe_str(raw.get("name"), f"Asset {asset_id}")
    assoc_char_names = _safe_list(raw.get("associated_character_names"))
    assoc_char_ids = []
    for cn in assoc_char_names:
        cid = char_name_to_id.get(cn.lower())
        if cid:
            assoc_char_ids.append(cid)
    return Asset(
        id=asset_id,
        name=name,
        category=_safe_enum(AssetCategory, raw.get("category"), AssetCategory.OTHER),
        description=_safe_str(raw.get("description")),
        significance=_safe_str(raw.get("significance")),
        associated_characters=assoc_char_ids,
        scene_ids=[],
    )


def _resolve_scene_names(
    scene_dict: dict,
    char_name_to_id: dict[str, str],
    loc_name_to_id: dict[str, str],
    asset_name_to_id: dict[str, str],
) -> dict:
    """Resolve entity names to IDs in a scene dict."""
    scene_num = _safe_int(scene_dict.get("scene_number"))

    # Characters
    char_names = _safe_list(scene_dict.get("character_names"))
    char_ids = []
    for cn in char_names:
        cid = char_name_to_id.get(str(cn).lower())
        char_ids.append(cid if cid else f"unresolved_{cn}")

    # Location
    loc_name = _safe_str(scene_dict.get("location_name"))
    loc_id = loc_name_to_id.get(loc_name.lower(), f"unresolved_{loc_name}") if loc_name else ""

    # Assets
    asset_names = _safe_list(scene_dict.get("asset_names"))
    asset_ids = []
    for an in asset_names:
        aid = asset_name_to_id.get(str(an).lower())
        asset_ids.append(aid if aid else f"unresolved_{an}")

    # Dialogue
    dialogue = []
    for d in _safe_list(scene_dict.get("dialogue")):
        cn = _safe_str(d.get("character_name"))
        cid = char_name_to_id.get(cn.lower(), f"unresolved_{cn}") if cn else ""
        dialogue.append({
            **d,
            "character_id": cid,
            "character_name": cn,
        })

    return {
        **scene_dict,
        "character_ids": char_ids,
        "location_id": loc_id,
        "asset_ids": asset_ids,
        "dialogue": dialogue,
    }


def _build_scene_breakdown(scene_raw: dict, p2_result: dict) -> SceneBreakdown:
    """Build a SceneBreakdown model from resolved scene dict + Pass 2 shots."""
    # Build shots
    shots = []
    for shot_raw in _safe_list(p2_result.get("shots")):
        try:
            shot_dialogue = []
            for d in _safe_list(shot_raw.get("dialogue")):
                shot_dialogue.append(DialogueLine(
                    character_id=_safe_str(d.get("character_id")),
                    character_name=_safe_str(d.get("character_name")),
                    parenthetical=d.get("parenthetical"),
                    text=_safe_str(d.get("text")),
                    original_language=d.get("original_language"),
                ))

            stills = []
            for still_raw in _safe_list(shot_raw.get("stills")):
                stills.append(ShotStill(
                    still_number=_safe_int(still_raw.get("still_number"), 1),
                    description=_safe_str(still_raw.get("description")),
                    image_prompt=still_raw.get("image_prompt"),
                ))

            shot = ShotSuggestion(
                shot_number=_safe_int(shot_raw.get("shot_number")),
                description=_safe_str(shot_raw.get("description")),
                shot_size=_safe_enum(ShotSize, shot_raw.get("shot_size"), ShotSize.MEDIUM),
                camera_angle=_safe_enum(CameraAngle, shot_raw.get("camera_angle"), CameraAngle.EYE_LEVEL),
                camera_movement=_safe_enum(CameraMovement, shot_raw.get("camera_movement"), CameraMovement.STATIC),
                lighting=_safe_enum(LightingStyle, shot_raw.get("lighting"), LightingStyle.NATURAL),
                duration_seconds=shot_raw.get("duration_seconds"),
                characters_in_frame=_safe_list(shot_raw.get("characters_in_frame")),
                assets_in_frame=_safe_list(shot_raw.get("assets_in_frame")),
                dialogue=shot_dialogue,
                rationale=_safe_str(shot_raw.get("rationale")),
                image_prompt=shot_raw.get("image_prompt"),
                stills=stills,
                still_count=_safe_int(shot_raw.get("still_count"), 1),
                ai_scene_suggestion=bool(shot_raw.get("ai_scene_suggestion")),
                ai_scene_rationale=shot_raw.get("ai_scene_rationale"),
            )
            shots.append(shot)
        except Exception as e:
            logger.warning(f"Failed to parse shot: {e}")

    # Build scene-level dialogue
    dialogue = []
    for d in _safe_list(scene_raw.get("dialogue")):
        dialogue.append(DialogueLine(
            character_id=_safe_str(d.get("character_id")),
            character_name=_safe_str(d.get("character_name")),
            parenthetical=d.get("parenthetical"),
            text=_safe_str(d.get("text")),
            original_language=d.get("original_language"),
        ))

    return SceneBreakdown(
        scene_number=_safe_int(scene_raw.get("scene_number")),
        scene_heading=_safe_str(scene_raw.get("scene_heading")),
        scene_type=_safe_enum(SceneType, scene_raw.get("scene_type"), SceneType.DIALOGUE),
        location_id=_safe_str(scene_raw.get("location_id")),
        int_ext=_safe_enum(InteriorExterior, scene_raw.get("int_ext"), InteriorExterior.UNSPECIFIED),
        time_of_day=_safe_enum(TimeOfDay, scene_raw.get("time_of_day"), TimeOfDay.UNSPECIFIED),
        estimated_duration_seconds=p2_result.get("estimated_duration_seconds"),
        page_eighths=p2_result.get("page_eighths"),
        raw_script_text=_safe_str(scene_raw.get("raw_script_text")),
        synopsis=_safe_str(scene_raw.get("synopsis")),
        mood=_safe_str(scene_raw.get("mood")),
        action_description=_safe_str(scene_raw.get("action_description")),
        character_ids=_safe_list(scene_raw.get("character_ids")),
        asset_ids=_safe_list(scene_raw.get("asset_ids")),
        dialogue=dialogue,
        shots=shots,
        vfx_notes=scene_raw.get("vfx_notes"),
        sfx_notes=scene_raw.get("sfx_notes"),
        music_notes=scene_raw.get("music_notes"),
        transition_in=scene_raw.get("transition_in"),
        transition_out=scene_raw.get("transition_out"),
    )


def _compute_relationships(
    characters: list[Character],
    assets: list[Asset],
    scenes_raw: list[dict],
) -> None:
    """Compute CharacterRelationships from accumulated scene data. Mutates characters in place."""
    scene_char_map: dict[int, list[str]] = {}
    scene_loc_map: dict[int, str] = {}
    scene_asset_map: dict[int, list[str]] = {}

    for s in scenes_raw:
        sn = s.get("scene_number", 0)
        scene_char_map[sn] = s.get("character_ids", [])
        scene_loc_map[sn] = s.get("location_id", "")
        scene_asset_map[sn] = s.get("asset_ids", [])

    for char in characters:
        co_chars: dict[str, list[int]] = {}
        assoc_locs: dict[str, list[int]] = {}
        assoc_assets: dict[str, list[int]] = {}

        for scene_num in char.scene_ids:
            for other_id in scene_char_map.get(scene_num, []):
                if other_id != char.id and not other_id.startswith("unresolved_"):
                    co_chars.setdefault(other_id, []).append(scene_num)

            loc_id = scene_loc_map.get(scene_num, "")
            if loc_id and not loc_id.startswith("unresolved_"):
                assoc_locs.setdefault(loc_id, []).append(scene_num)

            for aid in scene_asset_map.get(scene_num, []):
                if not aid.startswith("unresolved_"):
                    asset_obj = next((a for a in assets if a.id == aid), None)
                    if asset_obj and char.id in asset_obj.associated_characters:
                        assoc_assets.setdefault(aid, []).append(scene_num)

        char.relationships = CharacterRelationships(
            co_appearing_characters=co_chars,
            associated_locations=assoc_locs,
            associated_assets=assoc_assets,
        )


# ─── EntityAccumulator ────────────────────────────────────

@dataclass
class EntityAccumulator:
    """Running accumulator of entities discovered across scenes."""
    characters: list[Character] = field(default_factory=list)
    locations: list[Location] = field(default_factory=list)
    assets: list[Asset] = field(default_factory=list)

    char_name_to_id: dict[str, str] = field(default_factory=dict)
    loc_name_to_id: dict[str, str] = field(default_factory=dict)
    asset_name_to_id: dict[str, str] = field(default_factory=dict)

    _char_counter: int = 0
    _loc_counter: int = 0
    _asset_counter: int = 0

    title: str = "Untitled"
    detected_language: str = "en"

    def add_character(self, raw: dict, scene_number: int) -> Character:
        """Add a new character or return existing if name/alias matches."""
        name = _safe_str(raw.get("name"), "Unknown")

        # Dedup check: name or alias already known?
        existing_id = self.char_name_to_id.get(name.lower())
        if existing_id:
            existing = next(c for c in self.characters if c.id == existing_id)
            if scene_number not in existing.scene_ids:
                existing.scene_ids.append(scene_number)
            return existing

        # Check aliases
        for alias in _safe_list(raw.get("aliases")):
            existing_id = self.char_name_to_id.get(alias.lower())
            if existing_id:
                existing = next(c for c in self.characters if c.id == existing_id)
                if scene_number not in existing.scene_ids:
                    existing.scene_ids.append(scene_number)
                # Add new alias
                if alias not in existing.aliases:
                    existing.aliases.append(alias)
                return existing

        # Genuinely new character
        self._char_counter += 1
        char_id = f"char_{self._char_counter:02d}"
        char = _assemble_character(raw, char_id)
        char.scene_ids = [scene_number]
        if char.first_appearance_scene is None:
            char.first_appearance_scene = scene_number

        self.characters.append(char)
        self.char_name_to_id[name.lower()] = char_id
        for alias in char.aliases:
            self.char_name_to_id[alias.lower()] = char_id

        return char

    def add_location(self, raw: dict, scene_number: int) -> Location:
        """Add a new location or return existing."""
        name = _safe_str(raw.get("name"), "Unknown")

        existing_id = self.loc_name_to_id.get(name.lower())
        if existing_id:
            existing = next(l for l in self.locations if l.id == existing_id)
            if scene_number not in existing.scene_ids:
                existing.scene_ids.append(scene_number)
            return existing

        self._loc_counter += 1
        loc_id = f"loc_{self._loc_counter:02d}"
        loc = _assemble_location(raw, loc_id)
        loc.scene_ids = [scene_number]

        self.locations.append(loc)
        self.loc_name_to_id[name.lower()] = loc_id
        return loc

    def add_asset(self, raw: dict, scene_number: int) -> Asset:
        """Add a new asset or return existing."""
        name = _safe_str(raw.get("name"), "Unknown")

        existing_id = self.asset_name_to_id.get(name.lower())
        if existing_id:
            existing = next(a for a in self.assets if a.id == existing_id)
            if scene_number not in existing.scene_ids:
                existing.scene_ids.append(scene_number)
            return existing

        self._asset_counter += 1
        asset_id = f"asset_{self._asset_counter:02d}"
        asset = _assemble_asset(raw, asset_id, self.char_name_to_id)
        asset.scene_ids = [scene_number]

        self.assets.append(asset)
        self.asset_name_to_id[name.lower()] = asset_id
        return asset

    def get_known_characters_compact(self) -> list[dict]:
        """Return compact character info for prompt inclusion."""
        return [
            {"name": c.name, "aliases": c.aliases, "id": c.id}
            for c in self.characters
        ]

    def get_known_locations_compact(self) -> list[dict]:
        return [{"name": l.name, "id": l.id} for l in self.locations]

    def get_known_assets_compact(self) -> list[dict]:
        return [{"name": a.name, "id": a.id} for a in self.assets]

    def update_scene_ids_for_known_entities(self, scene_dict: dict, scene_number: int) -> None:
        """Update scene_ids for entities referenced in this scene's metadata."""
        for cn in _safe_list(scene_dict.get("character_names")):
            cid = self.char_name_to_id.get(str(cn).lower())
            if cid:
                char = next((c for c in self.characters if c.id == cid), None)
                if char and scene_number not in char.scene_ids:
                    char.scene_ids.append(scene_number)

        loc_name = _safe_str(scene_dict.get("location_name"))
        if loc_name:
            lid = self.loc_name_to_id.get(loc_name.lower())
            if lid:
                loc = next((l for l in self.locations if l.id == lid), None)
                if loc and scene_number not in loc.scene_ids:
                    loc.scene_ids.append(scene_number)

        for an in _safe_list(scene_dict.get("asset_names")):
            aid = self.asset_name_to_id.get(str(an).lower())
            if aid:
                asset = next((a for a in self.assets if a.id == aid), None)
                if asset and scene_number not in asset.scene_ids:
                    asset.scene_ids.append(scene_number)
