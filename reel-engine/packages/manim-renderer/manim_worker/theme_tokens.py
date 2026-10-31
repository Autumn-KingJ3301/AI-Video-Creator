"""
Corsela Editorial Design System tokens for Manim.
Matches packages/core/src/theme/tokens.ts.
"""

from __future__ import annotations

# Exact hex codes matching Corsela theme
COLOR_BACKGROUND = "#F4F0EA"       # Warm Ivory / Cream
COLOR_FOREGROUND = "#141413"       # Dark Charcoal
COLOR_ACCENT = "#C84B22"           # Terracotta / Burnt Orange
COLOR_ACCENT_HOVER = "#B33E17"
COLOR_ACCENT_LIGHT = "#FCEEE9"
COLOR_CARD = "#FFFFFF"             # Pure White
COLOR_CARD_BORDER = "#E6E0D5"      # Warm Border
COLOR_MUTED = "#6E6962"            # Secondary Text
COLOR_CHIP = "#EAE4D9"             # Soft Neutral

# 9:16 Vertical Camera Frame Configuration
# Standard Manim is 16:9 widescreen (8.0 x 14.22 inverted)
# For 9:16 vertical, frame width is 8.0 and height is 14.22
VERTICAL_FRAME_WIDTH = 8.0
VERTICAL_FRAME_HEIGHT = 14.2222

# Safe zone Y-bounds in Manim 9:16 coordinate units
# Top 14% -> top cutoff at y = +14.22/2 * (1 - 2*0.14) = +5.12
# Bottom 35% -> bottom cutoff at y = -14.22/2 * (1 - 2*0.35) = -2.13
SAFE_TOP_Y = 5.12
SAFE_BOTTOM_Y = -2.13
SAFE_LEFT_X = -3.52   # 6% margin on 8.0w -> 8/2 * (1 - 2*0.06) = 3.52
SAFE_RIGHT_X = 3.52
CARD_CENTER_Y = 1.49  # Center between safe top and safe bottom
