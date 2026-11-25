"""Frame-derived visual signals for HypeCut."""

from __future__ import annotations
import abc

import numpy as np

from ..types import AnalysisContext
from .base import Signal, register

__all__ = [
    "SceneChange",
    "Motion",
    "Flash",
    "RoiActivity",
    "LolAction",
]


def _frames(ctx: AnalysisContext) -> np.ndarray:
    assert ctx.gray is not None
    return ctx.gray.astype(np.float32, copy=False)


def _roi_activity(
    f: np.ndarray,
    box: list[float],
    threshold: float,
) -> np.ndarray:
    """Calculate frame-to-frame activity inside a normalized ROI."""
    if f.shape[0] < 2:
        return np.zeros(f.shape[0], dtype=np.float32)

    h, w = f.shape[1], f.shape[2]

    x0 = int(np.clip(box[0], 0, 1) * w)
    y0 = int(np.clip(box[1], 0, 1) * h)
    x1 = max(x0 + 1, int(np.clip(box[2], 0, 1) * w))
    y1 = max(y0 + 1, int(np.clip(box[3], 0, 1) * h))

    roi = f[:, y0:y1, x0:x1]

    d = np.abs(np.diff(roi, axis=0))
    activity = (d > threshold).mean(axis=(1, 2))

    return np.concatenate([activity[:1], activity])


@register("scene_change")
class SceneChange(Signal):
    """Mean absolute difference between consecutive frames."""

    description = "Frame-to-frame difference for cuts, respawns and major scene changes."
    requires_video = True
    noise_floor = 1.5

    def compute(self, ctx: AnalysisContext) -> np.ndarray:
        f = _frames(ctx)

        if f.shape[0] < 2:
            return np.zeros(ctx.n)

        diff = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))

        return np.concatenate([diff[:1], diff])


@register("motion")
class Motion(Signal):
    """Spatial variance of frame differences."""

    description = "Fraction of the frame in motion."
    requires_video = True
    noise_floor = 0.02

    def compute(self, ctx: AnalysisContext) -> np.ndarray:
        thr = float(self.params.get("threshold", 6.0))

        f = _frames(ctx)

        if f.shape[0] < 2:
            return np.zeros(ctx.n)

        d = np.abs(np.diff(f, axis=0))
        coverage = (d > thr).mean(axis=(1, 2))

        return np.concatenate([coverage[:1], coverage])


@register("flash")
class Flash(Signal):
    """Global brightness jumps."""

    description = "Global luminance jumps from flashes and major effects."
    requires_video = True
    noise_floor = 1.5

    def compute(self, ctx: AnalysisContext) -> np.ndarray:
        f = _frames(ctx)

        if f.shape[0] < 2:
            return np.zeros(ctx.n)

        mean = f.mean(axis=(1, 2))
        jump = np.abs(np.diff(mean))

        return np.concatenate([jump[:1], jump])


@register("roi_activity")
class RoiActivity(Signal):
    """Activity inside a fixed region of interest."""

    description = "Change inside a normalized ROI box."
    requires_video = True
    noise_floor = 0.05

    def compute(self, ctx: AnalysisContext) -> np.ndarray:
        box = self.params.get(
            "box",
            [0.62, 0.03, 0.99, 0.30],
        )

        thr = float(
            self.params.get("threshold", 8.0)
        )

        f = _frames(ctx)

        if f.shape[0] < 2:
            return np.zeros(ctx.n)

        return _roi_activity(f, box, thr)


@register("lol_action")
class LolAction(Signal):
    """
    LoL-specific action detector.

    Focuses on:
    - kill-feed changes
    - upper HUD activity
    - central combat activity
    - large combat movement
    - end-of-game / victory screen transitions

    This is intentionally vision-only. It does not use OCR.
    """

    description = "LoL combat, kill-feed and victory-event detector."
    requires_video = True
    noise_floor = 0.02
    def compute(self, ctx: AnalysisContext) -> np.ndarray:
        f = _frames(ctx)

        if f.shape[0] < 2:
            return np.zeros(ctx.n)


        # ---------------------------------------------------------
        # 1. LoL kill-feed region
        #
        # Typical LoL videos place the kill feed around the
        # upper-right area.
        #
        # We intentionally make this region strong because a
        # sudden change here is one of the clearest indicators
        # that a kill/death event occurred.
        # ---------------------------------------------------------

        killfeed = _roi_activity(
            f,
            [0.60, 0.00, 1.00, 0.24],
            5.0,
        )

        # ---------------------------------------------------------
        # 2. Wider upper HUD
        # ---------------------------------------------------------

        upper = _roi_activity(
            f,
            [0.30, 0.00, 1.00, 0.18],
            6.0,
        )

        # ---------------------------------------------------------
        # 3. Main gameplay / combat area
        # ---------------------------------------------------------

        center = _roi_activity(
            f,
            [0.18, 0.15, 0.82, 0.82],
            7.0,
        )

        # ---------------------------------------------------------
        # 4. Lower gameplay area
        # ---------------------------------------------------------

        lower = _roi_activity(
            f,
            [0.18, 0.70, 0.82, 1.00],
            7.0,
        )

        # ---------------------------------------------------------
        # 5. Global motion
        # ---------------------------------------------------------

        diff = np.abs(np.diff(f, axis=0))

        global_motion = (
            (diff > 6.0)
            .mean(axis=(1, 2))
        )

        global_motion = np.concatenate(
            [global_motion[:1], global_motion]
        )

        # ---------------------------------------------------------
        # 6. Scene changes
        #
        # Large scene changes can happen when:
        # - Nexus is destroyed
        # - Victory screen appears
        # - game transitions to end screen
        #
        # We don't want scene changes to dominate normal combat,
        # but we do want to preserve major ending events.
        # ---------------------------------------------------------

        scene_diff = np.abs(
            np.diff(f, axis=0)
        ).mean(axis=(1, 2))

        scene_diff = np.concatenate(
            [scene_diff[:1], scene_diff]
        )

        # ---------------------------------------------------------
        # 7. Base LoL action score
        #
        # Kill feed is intentionally weighted heavily.
        # ---------------------------------------------------------

        score = (
            killfeed * 5.0
            + upper * 1.5
            + center * 2.2
            + lower * 0.5
            + global_motion * 0.8
            + scene_diff * 0.35
        )

        # ---------------------------------------------------------
        # 8. Kill-feed burst
        #
        # A very sudden change in kill-feed area is more valuable
        # than a long period of small UI movement.
        # ---------------------------------------------------------

        kill_burst = killfeed > 0.035

        score[kill_burst] *= 1.8

        # ---------------------------------------------------------
        # 9. Very strong kill-feed event
        #
        # This is meant to push obvious kill-feed changes toward
        # the top of the candidate ranking.
        # ---------------------------------------------------------

        strong_kill = killfeed > 0.07

        score[strong_kill] *= 1.6

        # ---------------------------------------------------------
        # 10. Combat combination
        #
        # Kill-feed change + central combat movement at the same
        # time is much more likely to be a real fight.
        # ---------------------------------------------------------

        teamfight = (
            (killfeed > 0.025)
            & (center > 0.035)
        )

        score[teamfight] *= 1.45

        # ---------------------------------------------------------
        # 11. Static / non-combat scenes
        # ---------------------------------------------------------

        frame_std = f.std(axis=(1, 2))

        static_mask = (
            (center < 0.015)
            & (global_motion < 0.025)
        )

        score[static_mask] *= 0.25

        # ---------------------------------------------------------
        # 12. Shop-like scene
        #
        # Shop screens often have:
        # - relatively static center
        # - UI movement near the bottom
        # - little kill-feed activity
        #
        # Reduce their score.
        # ---------------------------------------------------------

        shop_like = (
            (center < 0.035)
            & (lower > 0.025)
            & (killfeed < 0.020)
        )

        score[shop_like] *= 0.20

        # ---------------------------------------------------------
        # 13. Low-detail / loading-like scenes
        # ---------------------------------------------------------

        low_detail = (
            (frame_std < 18)
            & (center < 0.025)
        )

        score[low_detail] *= 0.20

        # ---------------------------------------------------------
        # 14. Victory / end-game preservation
        #
        # We cannot read "VICTORY" without OCR, but major visual
        # transitions near the end of the match can still be
        # preserved by giving strong scene transitions an extra
        # boost when the screen changes substantially.
        # ---------------------------------------------------------

        major_transition = scene_diff > 12.0

        score[major_transition] *= 1.35

        # ---------------------------------------------------------
        # 15. Smooth the score so a single frame does not create
        # an unusably tiny clip.
        # ---------------------------------------------------------

        smooth = int(
            self.params.get("smooth_frames", 5)
        )

        if smooth > 1 and len(score) > 1:
            kernel = (
                np.ones(
                    smooth,
                    dtype=np.float32,
                )
                / smooth
            )

            score = np.convolve(
                score,
                kernel,
                mode="same",
            )

        return score.astype(np.float32)
    
@register("valorant_killfeed")
class ValorantKillfeed(Signal):
    """Valorant HUD activity detector using the upper-right killfeed area."""

    description = "Valorant upper-right killfeed and combat activity detector."
    requires_video = True
    noise_floor = 0.01

    def compute(self, ctx: AnalysisContext) -> np.ndarray:
        f = _frames(ctx)
        n = f.shape[0]

        if n < 2:
            return np.zeros(ctx.n, dtype=np.float32)

        # Valorant killfeed is commonly located in the upper-right corner.
        # This measures visual changes; it does not yet identify who got the kill.
        killfeed = _roi_activity(
            f,
            self.params.get("box", [0.60, 0.00, 1.00, 0.28]),
            float(self.params.get("threshold", 5.0)),
        )

        # Combat activity in the central gameplay area.
        center = _roi_activity(
            f,
            self.params.get("center_box", [0.18, 0.12, 0.82, 0.88]),
            float(self.params.get("center_threshold", 7.0)),
        )

        # Use killfeed changes as the main signal, not general screen motion.
        score = killfeed * 4.0 + center * 0.5

        # Boost moments where killfeed and gameplay activity overlap.
        overlap = (killfeed > 0.025) & (center > 0.025)
        score[overlap] *= 1.5

        # Suppress broad motion without corresponding killfeed activity.
        no_killfeed = killfeed < 0.01
        score[no_killfeed] *= 0.25

        smooth = max(1, int(self.params.get("smooth_frames", 3)))
        if smooth > 1:
            kernel = np.ones(smooth, dtype=np.float32) / smooth
            score = np.convolve(score, kernel, mode="same")

        return score.astype(np.float32)
