"""Pipeline progress tracker — writes progress updates to MongoDB as extraction runs."""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Optional

from bson import ObjectId

from ..db import get_db

logger = logging.getLogger(__name__)

# Gemini pricing per million tokens (USD)
# Model → (input_per_1M, output_per_1M)
_GEMINI_PRICING: dict[str, tuple[float, float]] = {
    "gemini-2.5-flash": (0.30, 2.50),
    "gemini-2.5-flash-lite": (0.075, 0.30),
    "gemini-2.5-pro": (1.25, 10.00),
    "gemini-3.1-flash-lite-preview": (0.25, 1.50),
}

# Fallback pricing if model not found (uses 2.5-flash rates)
_DEFAULT_PRICING = (0.30, 2.50)


def _compute_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """Compute USD cost for given token counts."""
    pricing = _GEMINI_PRICING.get(model, _DEFAULT_PRICING)
    input_cost = (input_tokens / 1_000_000) * pricing[0]
    output_cost = (output_tokens / 1_000_000) * pricing[1]
    return input_cost + output_cost


@dataclass
class PipelineTracker:
    """Tracks extraction pipeline progress in the project document."""

    project_id: str
    model: str = "gemini-flash-latest"
    _started_at: float = field(default_factory=time.time, init=False)
    _phases_completed: list[str] = field(default_factory=list, init=False)
    _total_phases: int = 3  # phase_0 + N scenes (set dynamically) + finalizing
    _input_tokens: int = 0
    _output_tokens: int = 0
    _calls_made: int = 0
    _scenes_processed: int = 0
    _scenes_total: int = 0
    _current_phase: str = ""
    _phase_label: str = ""
    _estimated_cost: Optional[float] = None

    async def _update_db(self, extra_sets: Optional[dict] = None) -> None:
        """Push current progress state to MongoDB."""
        elapsed = time.time() - self._started_at
        cost_so_far = _compute_cost(self.model, self._input_tokens, self._output_tokens)
        progress = {
            "pipeline_progress.current_phase": self._current_phase,
            "pipeline_progress.phase_label": self._phase_label,
            "pipeline_progress.phases_completed": self._phases_completed.copy(),
            "pipeline_progress.total_phases": self._total_phases,
            "pipeline_progress.scenes_processed": self._scenes_processed,
            "pipeline_progress.scenes_total": self._scenes_total,
            "pipeline_progress.token_usage.input_tokens": self._input_tokens,
            "pipeline_progress.token_usage.output_tokens": self._output_tokens,
            "pipeline_progress.token_usage.total_tokens": self._input_tokens + self._output_tokens,
            "pipeline_progress.token_usage.calls_made": self._calls_made,
            "pipeline_progress.cost_usd": round(cost_so_far, 6),
            "pipeline_progress.started_at": self._started_at,
            "pipeline_progress.elapsed_seconds": round(elapsed, 1),
        }
        if self._estimated_cost is not None:
            progress["pipeline_progress.estimated_total_cost_usd"] = round(self._estimated_cost, 6)
        if extra_sets:
            progress.update(extra_sets)

        try:
            db = get_db()
            await db.projects.update_one(
                {"_id": ObjectId(self.project_id)},
                {"$set": progress},
            )
        except Exception as e:
            logger.warning("Failed to update pipeline progress: %s", e)

    async def start_phase(self, name: str, label: str) -> None:
        """Mark a new phase as current."""
        self._current_phase = name
        self._phase_label = label
        logger.info("Pipeline [%s] phase: %s — %s", self.project_id[:8], name, label)
        await self._update_db()

    async def complete_phase(self, name: str) -> None:
        """Push phase to completed list."""
        if name not in self._phases_completed:
            self._phases_completed.append(name)
        await self._update_db()

    async def update_scene_progress(self, processed: int, total: int) -> None:
        """Update scene-level counters."""
        self._scenes_processed = processed
        self._scenes_total = total
        await self._update_db()

    async def set_scenes_total(self, total: int) -> None:
        """Set the total number of scenes (discovered in phase 0).
        Also updates total_phases = phase_0 + N scenes + finalizing."""
        self._scenes_total = total
        self._total_phases = total + 2  # phase_0 + N scenes + finalizing
        await self._update_db()

    async def add_token_usage(self, input_tokens: int, output_tokens: int) -> None:
        """Accumulate token usage from an LLM call."""
        self._input_tokens += input_tokens
        self._output_tokens += output_tokens
        self._calls_made += 1
        # Update estimated remaining based on avg tokens per call vs remaining calls
        await self._update_db()

    async def set_estimated_remaining(self, tokens: int) -> None:
        """Set projected remaining tokens and recalculate estimated total cost."""
        # Project total cost = cost so far + estimated remaining cost
        # Assume remaining tokens split ~50/50 input/output (rough approximation)
        remaining_input = int(tokens * 0.7)
        remaining_output = int(tokens * 0.3)
        remaining_cost = _compute_cost(self.model, remaining_input, remaining_output)
        current_cost = _compute_cost(self.model, self._input_tokens, self._output_tokens)
        self._estimated_cost = current_cost + remaining_cost
        await self._update_db({
            "pipeline_progress.token_usage.estimated_remaining_tokens": tokens,
        })

    async def set_cost_projection(self, script_char_count: int, num_scenes: int) -> None:
        """Set initial cost projection based on script size before LLM calls begin.

        Sequential pipeline: 2 LLM calls per scene (entity+metadata + shots).
        Each scene call includes the scene text + growing entity context.
        """
        avg_scene_chars = script_char_count // max(num_scenes, 1)
        avg_scene_tokens = avg_scene_chars // 4

        # Per-scene entity+metadata call: scene text + entity context (grows ~500 tokens per scene avg)
        # Average entity context across scenes ≈ num_scenes/2 * 500
        avg_entity_context = (num_scenes // 2) * 500
        scene_call_input = num_scenes * (avg_scene_tokens + avg_entity_context // num_scenes if num_scenes else 0)
        scene_call_output = num_scenes * 4000  # entities + scene metadata

        # Per-scene Pass 2 call: scene context + shot generation
        pass2_input = num_scenes * 4000
        pass2_output = num_scenes * 3000

        total_input = scene_call_input + pass2_input
        total_output = scene_call_output + pass2_output

        self._estimated_cost = _compute_cost(self.model, total_input, total_output)
        await self._update_db()

    async def finish(self) -> None:
        """Clear the progress (pipeline done)."""
        elapsed = time.time() - self._started_at
        final_cost = _compute_cost(self.model, self._input_tokens, self._output_tokens)
        try:
            db = get_db()
            await db.projects.update_one(
                {"_id": ObjectId(self.project_id)},
                {"$set": {
                    "pipeline_progress.current_phase": "done",
                    "pipeline_progress.phase_label": "Complete",
                    "pipeline_progress.elapsed_seconds": round(elapsed, 1),
                    "pipeline_progress.token_usage.input_tokens": self._input_tokens,
                    "pipeline_progress.token_usage.output_tokens": self._output_tokens,
                    "pipeline_progress.token_usage.total_tokens": self._input_tokens + self._output_tokens,
                    "pipeline_progress.token_usage.calls_made": self._calls_made,
                    "pipeline_progress.cost_usd": round(final_cost, 6),
                    "pipeline_progress.estimated_total_cost_usd": round(final_cost, 6),
                }},
            )
        except Exception as e:
            logger.warning("Failed to finalize pipeline progress: %s", e)
