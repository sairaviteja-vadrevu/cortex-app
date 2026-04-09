"""Phase 0: Pre-split screenplay at scene headings (INT./EXT.) before LLM calls."""
from __future__ import annotations

import re
from dataclasses import dataclass

# Matches standard screenplay scene headings:
# INT. / EXT. / INT./EXT. / I/E. variants, followed by location and optional time
_SCENE_HEADING_RE = re.compile(
    r"^[ \t]*(INT|EXT|I/?E)\.?(?:[/ ]*(?:INT|EXT)\.?)?[ \t]+.+",
    re.IGNORECASE | re.MULTILINE,
)

# Fallback: "Scene N:" or "SCENE N:" or "Scene N -" or just "Scene:" patterns (transcripts, fan scripts)
_SCENE_N_RE = re.compile(
    r"^[ \t]*Scene\s*(?:\d+)?\s*[:\-–—]",
    re.IGNORECASE | re.MULTILINE,
)

# Fallback: "CHAPTER N" / "ACT N" patterns (novels, plays)
_CHAPTER_ACT_RE = re.compile(
    r"^[ \t]*(CHAPTER|ACT)\s+(\d+|[IVXLC]+)\b.*",
    re.IGNORECASE | re.MULTILINE,
)

# Character-count-based chunking threshold
_CHUNK_SIZE = 4000


@dataclass
class PreSplitScene:
    scene_number: int
    heading: str
    raw_text: str


def _split_by_regex(script_text: str, pattern: re.Pattern) -> list[PreSplitScene]:
    """Split script using a regex pattern. Returns empty list if no matches."""
    matches = list(pattern.finditer(script_text))
    if not matches:
        return []

    scenes: list[PreSplitScene] = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(script_text)
        chunk = script_text[start:end].strip()
        heading = match.group(0).strip()
        scenes.append(PreSplitScene(
            scene_number=i + 1,
            heading=heading,
            raw_text=chunk,
        ))
    return scenes


def _chunk_by_size(script_text: str, chunk_size: int = _CHUNK_SIZE) -> list[PreSplitScene]:
    """Split large scripts into fixed-size chunks as a last resort."""
    lines = script_text.splitlines(keepends=True)
    scenes: list[PreSplitScene] = []
    current_chunk: list[str] = []
    current_len = 0

    for line in lines:
        current_chunk.append(line)
        current_len += len(line)
        if current_len >= chunk_size:
            text = "".join(current_chunk).strip()
            if text:
                scenes.append(PreSplitScene(
                    scene_number=len(scenes) + 1,
                    heading=f"Section {len(scenes) + 1}",
                    raw_text=text,
                ))
            current_chunk = []
            current_len = 0

    # Remaining text
    if current_chunk:
        text = "".join(current_chunk).strip()
        if text:
            scenes.append(PreSplitScene(
                scene_number=len(scenes) + 1,
                heading=f"Section {len(scenes) + 1}",
                raw_text=text,
            ))

    return scenes


def split_scenes(script_text: str) -> list[PreSplitScene]:
    """Split a screenplay into scenes based on INT./EXT. slug lines.

    Falls back through progressively looser patterns:
    1. INT./EXT. headings (standard screenplays)
    2. "Scene N:" patterns (transcripts)
    3. "CHAPTER N" / "ACT N" patterns (novels/plays)
    4. Character-count-based chunking (large scripts with no detectable headings)

    Returns at least one PreSplitScene.
    """
    # Try standard screenplay headings first
    scenes = _split_by_regex(script_text, _SCENE_HEADING_RE)
    if scenes:
        return scenes

    # Fallback: "Scene N:" pattern
    scenes = _split_by_regex(script_text, _SCENE_N_RE)
    if scenes:
        return scenes

    # Fallback: Chapter/Act pattern
    scenes = _split_by_regex(script_text, _CHAPTER_ACT_RE)
    if scenes:
        return scenes

    # Last resort for large scripts: chunk by character count
    if len(script_text) > _CHUNK_SIZE * 2:
        scenes = _chunk_by_size(script_text)
        if len(scenes) > 1:
            return scenes

    # Single scene fallback
    return [PreSplitScene(scene_number=1, heading="", raw_text=script_text.strip())]
