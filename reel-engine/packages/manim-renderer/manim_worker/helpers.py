"""
Shared Manim Helpers for 9:16 Vertical Reels with Corsela Editorial Design.
"""

from __future__ import annotations
from manim_worker.theme_tokens import (
    COLOR_BACKGROUND,
    COLOR_FOREGROUND,
    COLOR_ACCENT,
    COLOR_CARD,
    COLOR_CARD_BORDER,
    COLOR_MUTED,
    COLOR_CHIP,
    VERTICAL_FRAME_WIDTH,
    VERTICAL_FRAME_HEIGHT,
    SAFE_TOP_Y,
    SAFE_BOTTOM_Y,
    SAFE_LEFT_X,
    SAFE_RIGHT_X,
    CARD_CENTER_Y,
)

try:
    from manim import Scene, Rectangle, Text, VGroup, UP, DOWN, LEFT, RIGHT, ORIGIN
    MANIM_INSTALLED = True
except ImportError:
    # Lightweight mock for unit testing and dry runs
    class Scene:
        def __init__(self):
            self.camera = type("Camera", (), {
                "frame_width": VERTICAL_FRAME_WIDTH,
                "frame_height": VERTICAL_FRAME_HEIGHT,
                "background_color": COLOR_BACKGROUND,
            })()
    MANIM_INSTALLED = False


class ReelScene(Scene):
    """
    Base Scene class for vertical 9:16 Reels in the Corsela theme.
    Configures camera, background color, and safe margin bounds.
    """
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if hasattr(self, "camera"):
            self.camera.frame_width = VERTICAL_FRAME_WIDTH
            self.camera.frame_height = VERTICAL_FRAME_HEIGHT
            self.camera.background_color = COLOR_BACKGROUND

    @staticmethod
    def safe_top() -> float:
        """Y-coordinate of the upper safe zone boundary (below header)."""
        return SAFE_TOP_Y

    @staticmethod
    def safe_bottom() -> float:
        """Y-coordinate of the lower safe zone boundary (above caption bar)."""
        return SAFE_BOTTOM_Y

    @staticmethod
    def card_center() -> float:
        """Y-coordinate centered in the primary viewing safe area."""
        return CARD_CENTER_Y

    @staticmethod
    def safe_bounds() -> tuple[float, float, float, float]:
        """Returns (left_x, right_x, bottom_y, top_y)."""
        return (SAFE_LEFT_X, SAFE_RIGHT_X, SAFE_BOTTOM_Y, SAFE_TOP_Y)
