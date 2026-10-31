/**
 * Corsela Editorial Design System & Theme Tokens.
 * Unified design language for Remotion and Manim 9:16 vertical reels.
 */

export const CorselaTheme = {
  name: "corsela_editorial",
  colors: {
    background: "#F4F0EA",       // Warm Ivory / Cream Canvas
    foreground: "#141413",       // Dark Charcoal / Primary text
    accent: "#C84B22",           // Terracotta / Burnt Orange brand accent
    accentHover: "#B33E17",      // Darker terracotta
    accentLight: "#FCEEE9",      // Soft terracotta tint for pill backgrounds
    cardBackground: "#FFFFFF",   // Pure White floating card
    cardBorder: "#E6E0D5",       // Subtle warm gray card border
    muted: "#6E6962",            // Secondary / muted body text
    chipBackground: "#EAE4D9",   // Neutral pill chip background
    shadow: "rgba(20, 20, 19, 0.06)", // Soft diffused card shadow
  },
  typography: {
    display: "Plus Jakarta Sans, Inter, -apple-system, sans-serif",
    body: "Inter, -apple-system, sans-serif",
    mono: "JetBrains Mono, monospace",
    stepIndexFontWeight: 700,
  },
  safeZone: {
    topPercent: 0.14,            // 269px on 1920h
    bottomPercent: 0.35,         // 672px on 1920h
    sidePercent: 0.06,           // 65px on 1080w
    centerCrop: { width: 1080, height: 1440 }, // 3:4 crop guide
  },
  card: {
    borderRadius: 24,           // Rounded corners (px)
    topAccentHeight: 4,          // Terracotta top accent line height (px)
    padding: 48,                 // Card inner padding (px)
  },
  motion: {
    entranceEaseOut: "cubic-bezier(0.16, 1, 0.3, 1)", // Snappy overshoot ease-out
    standardDurationFrames: 10,
    staggerDelayFrames: 4,
  },
} as const;

export type ThemeTokens = typeof CorselaTheme;
