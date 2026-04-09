from pydantic import BaseModel, Field
from typing import Optional
from uuid import uuid4
from datetime import datetime
from enum import Enum
from .enums import *


# ─── Auth / Organization Enums & Models ──────────────────

class OrganizationRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    USER = "user"


class ProjectAccess(str, Enum):
    ALL_MEMBERS = "all_members"
    TEAM = "team"
    SELECT_USERS = "select_users"
    PRIVATE = "private"


class ProjectType(str, Enum):
    STANDALONE = "standalone"
    FRANCHISE = "franchise"
    SERIES = "series"


class CollectionType(str, Enum):
    FRANCHISE = "franchise"
    SERIES = "series"


class OrgMembership(BaseModel):
    org_id: str
    role: OrganizationRole


class Team(BaseModel):
    id: str = Field(default_factory=lambda: f"team_{uuid4().hex[:8]}")
    name: str
    member_user_ids: list[str] = Field(default_factory=list)


class Organization(BaseModel):
    id: str  # MongoDB ObjectId as hex string
    name: str
    url: str = ""
    image: str = "/default-org.svg"
    invite_code: str = Field(default_factory=lambda: uuid4().hex[:8])
    teams: list[Team] = Field(default_factory=list)
    created_at: str


class User(BaseModel):
    id: str
    email: str
    name: str = ""
    organizations: list[OrgMembership] = Field(default_factory=list)
    active_org_id: Optional[str] = None
    created_at: str


# ─── Collection Models ───────────────────────────────────

class SeasonInfo(BaseModel):
    season_number: int
    title: Optional[str] = None


class Collection(BaseModel):
    collection_id: str = Field(default_factory=lambda: f"col_{uuid4().hex[:8]}")
    title: str
    collection_type: CollectionType
    genre: Optional[str] = None
    aesthetic: Optional[str] = None
    description: Optional[str] = None
    seasons: list[SeasonInfo] = Field(default_factory=list)
    org_id: str = ""
    access: ProjectAccess = ProjectAccess.ALL_MEMBERS
    access_team_id: Optional[str] = None
    access_user_ids: list[str] = Field(default_factory=list)
    created_by: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class CollectionSummary(BaseModel):
    collection_id: str
    title: str
    collection_type: CollectionType
    genre: Optional[str] = None
    aesthetic: Optional[str] = None
    project_count: int = 0
    season_count: int = 0
    created_at: str
    org_id: str = ""
    created_by: str = ""


# ─── Character Structured Metadata ───────────────────────

class CharacterMetadata(BaseModel):
    """Structured physical and personality attributes of a character."""

    age_range: Optional[str] = Field(None, description="e.g., '30-35', 'elderly', 'teenager'")
    gender: Optional[str] = Field(None, description="e.g., 'male', 'female', 'non-binary'")
    build: Optional[str] = Field(None, description="e.g., 'athletic', 'slim', 'heavyset'")
    ethnicity: Optional[str] = Field(None, description="e.g., 'South Asian', 'East Asian', 'Black'")
    hair: Optional[str] = Field(None, description="e.g., 'black, short cropped'")
    eye_color: Optional[str] = Field(None, description="e.g., 'brown', 'blue'")
    skin_tone: Optional[str] = Field(None, description="e.g., 'dark', 'fair', 'olive'")
    clothing_style: Optional[str] = Field(None, description="Default/typical outfit")
    distinguishing_features: Optional[str] = Field(None, description="Scars, tattoos, glasses, etc.")
    personality_traits: list[str] = Field(default_factory=list)
    speaking_style: Optional[str] = Field(None, description="How they talk")

    ai_inferred_fields: list[str] = Field(
        default_factory=list,
        description="Field names that were inferred by AI rather than explicitly stated in the script."
    )


# ─── Character Co-occurrence / Relationships ─────────────

class CharacterRelationships(BaseModel):
    """Mapping of what other entities this character is connected to."""

    co_appearing_characters: dict[str, list[int]] = Field(
        default_factory=dict,
        description="char_id → [scene numbers where both appear]"
    )
    associated_locations: dict[str, list[int]] = Field(
        default_factory=dict,
        description="loc_id → [scene numbers where character is at this location]"
    )
    associated_assets: dict[str, list[int]] = Field(
        default_factory=dict,
        description="asset_id → [scene numbers where character interacts with asset]"
    )


# ─── Global Entity: Character ────────────────────────────

class Character(BaseModel):
    id: str = Field(default_factory=lambda: f"char_{uuid4().hex[:8]}")
    name: str = Field(description="Primary name used in script")
    aliases: list[str] = Field(default_factory=list)
    tier: CharacterTier
    description: str = Field(description="Full text description")
    metadata: CharacterMetadata = Field(default_factory=CharacterMetadata)
    arc_summary: Optional[str] = Field(None)
    role_in_story: Optional[str] = Field(None)
    first_appearance_scene: Optional[int] = None
    scene_ids: list[int] = Field(default_factory=list)
    dialogue_count: int = Field(0)
    relationships: CharacterRelationships = Field(default_factory=CharacterRelationships)
    image_prompt: Optional[str] = Field(None)
    image_url: Optional[str] = None
    reference_description: Optional[str] = None
    voice_id: Optional[str] = Field(None, description="TTS voice preset ID for dialogue generation")


# ─── Global Entity: Location ─────────────────────────────

class Location(BaseModel):
    id: str = Field(default_factory=lambda: f"loc_{uuid4().hex[:8]}")
    name: str
    full_description: str = Field(description="Detailed visual description")
    int_ext: InteriorExterior
    setting_type: str = Field(description="apartment, forest, office, etc.")
    mood: Optional[str] = None
    scene_ids: list[int] = Field(default_factory=list)
    image_prompt: Optional[str] = None
    image_url: Optional[str] = None
    reference_description: Optional[str] = None


# ─── Global Entity: Asset ────────────────────────────────

class Asset(BaseModel):
    id: str = Field(default_factory=lambda: f"asset_{uuid4().hex[:8]}")
    name: str
    category: AssetCategory
    description: str
    significance: str = Field(description="Narrative importance")
    associated_characters: list[str] = Field(default_factory=list, description="Character IDs")
    scene_ids: list[int] = Field(default_factory=list)
    image_url: Optional[str] = None
    reference_description: Optional[str] = None


# ─── Scene-Level Models ──────────────────────────────────

class DialogueLine(BaseModel):
    character_id: str
    character_name: str
    parenthetical: Optional[str] = None
    text: str = Field("", description="ORIGINAL LANGUAGE — never translated")
    original_language: Optional[str] = Field(None)


class ShotStill(BaseModel):
    still_number: int
    description: str = Field(description="What this specific moment captures")
    image_prompt: Optional[str] = None
    image_url: Optional[str] = None


class ShotSuggestion(BaseModel):
    shot_number: int
    description: str = Field(description="What happens visually")
    shot_size: ShotSize
    camera_angle: CameraAngle
    camera_movement: CameraMovement
    lighting: LightingStyle
    duration_seconds: Optional[float] = None
    characters_in_frame: list[str] = Field(default_factory=list, description="Character IDs")
    assets_in_frame: list[str] = Field(default_factory=list, description="Asset IDs")
    dialogue: list[DialogueLine] = Field(default_factory=list, description="Dialogue lines occurring during this shot")
    rationale: str = Field(description="WHY this shot style was chosen")
    image_prompt: Optional[str] = Field(None)
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    stills: list[ShotStill] = Field(default_factory=list)
    still_count: int = Field(1)
    ai_scene_suggestion: bool = Field(False)
    ai_scene_rationale: Optional[str] = None


class SceneBreakdown(BaseModel):
    scene_number: int
    scene_heading: str
    scene_type: SceneType = Field(description="Primary dramatic function of the scene")
    location_id: str
    int_ext: InteriorExterior
    time_of_day: TimeOfDay
    estimated_duration_seconds: Optional[float] = None
    page_eighths: Optional[float] = None

    raw_script_text: str = Field(description="Verbatim script text for this scene")
    synopsis: str = Field(description="1-3 sentence summary")
    mood: str = Field(description="Emotional tone / atmosphere")
    action_description: str = Field(description="Non-dialogue action, summarized")

    character_ids: list[str] = Field(description="Character IDs present")
    asset_ids: list[str] = Field(description="Asset IDs used/visible")

    dialogue: list[DialogueLine] = Field(default_factory=list)
    shots: list[ShotSuggestion] = Field(default_factory=list)

    vfx_notes: Optional[str] = None
    sfx_notes: Optional[str] = None
    music_notes: Optional[str] = None
    transition_in: Optional[str] = None
    transition_out: Optional[str] = None

    # Production media (persisted from client-side generation)
    scene_video_url: Optional[str] = None
    voiceover_url: Optional[str] = None
    music_url: Optional[str] = None
    assembled_url: Optional[str] = None


# ─── Reference Preferences ───────────────────────────────

class ReferencePreferences(BaseModel):
    provide_character_designs: bool = False
    character_design_tiers: list[str] = Field(default_factory=list)  # ["primary", "secondary"]
    provide_location_references: bool = False
    provide_asset_references: bool = False


# ─── Top-Level Project ────────────────────────────────────

class StoryboardProject(BaseModel):
    project_id: str = Field(default_factory=lambda: f"proj_{uuid4().hex[:8]}")
    title: str
    genre: Optional[str] = None
    aesthetic: Optional[str] = None
    target_duration_minutes: Optional[float] = None
    detected_language: str
    llm_provider: LLMProvider
    llm_model: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    status: str = "ready"
    error_message: Optional[str] = None

    total_scenes: int
    total_characters: int
    total_locations: int
    total_assets: int

    characters: list[Character]
    locations: list[Location]
    assets: list[Asset]
    scenes: list[SceneBreakdown]

    raw_script: Optional[str] = None
    final_video_url: Optional[str] = None

    character_scene_map: dict[str, list[int]] = Field(default_factory=dict)
    location_scene_map: dict[str, list[int]] = Field(default_factory=dict)
    asset_scene_map: dict[str, list[int]] = Field(default_factory=dict)

    org_id: str = ""
    access: ProjectAccess = ProjectAccess.ALL_MEMBERS
    access_team_id: Optional[str] = None
    access_user_ids: list[str] = Field(default_factory=list)
    created_by: str = ""
    reference_preferences: Optional[ReferencePreferences] = None
    project_type: ProjectType = ProjectType.STANDALONE
    collection_id: Optional[str] = None
    sort_order: int = 0
    season_number: Optional[int] = None
    episode_number: Optional[int] = None


# ─── Project List Item (lightweight) ──────────────────────

class ProjectSummary(BaseModel):
    project_id: str
    title: str
    genre: Optional[str] = None
    aesthetic: Optional[str] = None
    detected_language: str
    llm_provider: LLMProvider
    llm_model: str
    created_at: str
    total_scenes: int
    total_characters: int
    total_images: int = 0
    total_videos: int = 0
    total_audio: int = 0
    status: str = "ready"
    error_message: Optional[str] = None
    org_id: str = ""
    access: ProjectAccess = ProjectAccess.ALL_MEMBERS
    access_team_id: Optional[str] = None
    access_user_ids: list[str] = Field(default_factory=list)
    created_by: str = ""
    project_type: ProjectType = ProjectType.STANDALONE
    collection_id: Optional[str] = None
    sort_order: int = 0
    season_number: Optional[int] = None
    episode_number: Optional[int] = None


# ─── Request / Response Models ────────────────────────────

class CharacterMetadataUpdate(BaseModel):
    age_range: Optional[str] = None
    gender: Optional[str] = None
    build: Optional[str] = None
    ethnicity: Optional[str] = None
    hair: Optional[str] = None
    eye_color: Optional[str] = None
    skin_tone: Optional[str] = None
    clothing_style: Optional[str] = None
    distinguishing_features: Optional[str] = None
    personality_traits: Optional[list[str]] = None
    speaking_style: Optional[str] = None


class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    tier: Optional[CharacterTier] = None
    description: Optional[str] = None
    arc_summary: Optional[str] = None
    role_in_story: Optional[str] = None
    image_prompt: Optional[str] = None
    image_url: Optional[str] = None
    reference_description: Optional[str] = None
    voice_id: Optional[str] = None
    metadata: Optional[CharacterMetadataUpdate] = None


class ProjectCreateRequest(BaseModel):
    genre: Optional[str] = None
    aesthetic: Optional[str] = None
    duration_minutes: Optional[float] = None
    llm_provider: LLMProvider = LLMProvider.ANTHROPIC
    llm_model: Optional[str] = None


class PipelineTokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    estimated_remaining_tokens: Optional[int] = None
    calls_made: int = 0


class PipelineProgress(BaseModel):
    current_phase: str = ""
    phase_label: str = ""
    phases_completed: list[str] = Field(default_factory=list)
    total_phases: int = 7
    scenes_processed: int = 0
    scenes_total: int = 0
    percent_complete: int = 0
    token_usage: PipelineTokenUsage = Field(default_factory=PipelineTokenUsage)
    cost_usd: float = 0.0
    estimated_total_cost_usd: Optional[float] = None
    elapsed_seconds: float = 0
    started_at: Optional[float] = None


class ProjectStatus(BaseModel):
    project_id: str
    status: str
    error_message: Optional[str] = None
    progress: Optional[PipelineProgress] = None


class ProjectCreateResponse(BaseModel):
    project_id: str
    status: str
    title: str
