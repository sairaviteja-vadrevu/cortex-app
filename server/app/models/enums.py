from enum import Enum


class ShotSize(str, Enum):
    EXTREME_WIDE = "extreme_wide"
    WIDE = "wide"
    FULL = "full"
    MEDIUM_WIDE = "medium_wide"
    MEDIUM = "medium"
    MEDIUM_CLOSE = "medium_close"
    CLOSE_UP = "close_up"
    EXTREME_CLOSE_UP = "extreme_close_up"
    INSERT = "insert"


class CameraMovement(str, Enum):
    STATIC = "static"
    PAN = "pan"
    TILT = "tilt"
    DOLLY = "dolly"
    TRUCK = "truck"
    CRANE = "crane"
    HANDHELD = "handheld"
    STEADICAM = "steadicam"
    ZOOM = "zoom"
    RACK_FOCUS = "rack_focus"
    TRACKING = "tracking"
    AERIAL = "aerial"


class CameraAngle(str, Enum):
    EYE_LEVEL = "eye_level"
    LOW = "low"
    HIGH = "high"
    BIRDS_EYE = "birds_eye"
    WORMS_EYE = "worms_eye"
    DUTCH = "dutch"
    OVER_THE_SHOULDER = "over_the_shoulder"
    POV = "pov"


class LightingStyle(str, Enum):
    HIGH_KEY = "high_key"
    LOW_KEY = "low_key"
    NATURAL = "natural"
    CHIAROSCURO = "chiaroscuro"
    SILHOUETTE = "silhouette"
    BACKLIT = "backlit"
    PRACTICAL = "practical"
    NEON = "neon"
    GOLDEN_HOUR = "golden_hour"
    MOONLIT = "moonlit"


class TimeOfDay(str, Enum):
    DAY = "day"
    NIGHT = "night"
    DAWN = "dawn"
    DUSK = "dusk"
    UNSPECIFIED = "unspecified"


class InteriorExterior(str, Enum):
    INTERIOR = "interior"
    EXTERIOR = "exterior"
    BOTH = "both"
    UNSPECIFIED = "unspecified"


class CharacterTier(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    TERTIARY = "tertiary"
    EXTRA = "extra"


class SceneType(str, Enum):
    """Classification of a scene's primary dramatic function.

    Expand or reduce this list as needed — it is the single source of truth.
    """
    DIALOGUE = "dialogue"              # Conversation-driven
    ACTION = "action"                  # Physical action, fights, chases
    SUSPENSE = "suspense"              # Tension-building, thriller beats
    EXPOSITION = "exposition"          # Setup, world-building, backstory
    MONTAGE = "montage"                # Time-passing sequence, compilation
    EMOTIONAL = "emotional"            # Character-driven emotional beat
    CONFRONTATION = "confrontation"    # Direct clash (verbal or physical showdown)
    TRANSITION = "transition"          # Brief connective scene (travel, establishing)
    DISCOVERY = "discovery"            # Reveal, investigation, finding clues
    CLIMAX = "climax"                  # Story climax / turning point


# Convenience list for prompts — kept in sync with the enum automatically.
SCENE_TYPES: list[str] = [e.value for e in SceneType]


class AssetCategory(str, Enum):
    PROP = "prop"
    VEHICLE = "vehicle"
    WEAPON = "weapon"
    COSTUME = "costume"
    SET_DRESSING = "set_dressing"
    SPECIAL_EFFECT = "special_effect"
    TECHNOLOGY = "technology"
    FOOD_DRINK = "food_drink"
    DOCUMENT = "document"
    OTHER = "other"


class LLMProvider(str, Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"


# Model config — update ONLY here, never hardcode elsewhere
DEFAULT_MODELS = {
    LLMProvider.ANTHROPIC: "claude-sonnet-4-20250514",
    LLMProvider.OPENAI: "gpt-4o",
    LLMProvider.GOOGLE: "gemini-2.5-flash",
}

AVAILABLE_MODELS = {
    LLMProvider.ANTHROPIC: [
        "claude-sonnet-4-20250514",
        "claude-opus-4-20250514",
        "claude-haiku-4-5-20251001",
    ],
    LLMProvider.OPENAI: [
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4.1",
        "gpt-4.1-mini",
    ],
    LLMProvider.GOOGLE: [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.5-pro",
        "gemini-3.1-flash-lite-preview",
    ],
}
