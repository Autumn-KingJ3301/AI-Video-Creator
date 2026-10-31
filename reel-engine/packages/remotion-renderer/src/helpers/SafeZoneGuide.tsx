import React from "react";
import { CorselaTheme } from "../../../core/src/theme/tokens.js";

export interface SafeZoneGuideProps {
  show?: boolean;
}

/**
 * Visual safe zone guide for Instagram Reels mobile interface overlay:
 * - Top 14% (269px) header & search bar
 * - Bottom 35% (672px) caption, audio, and action rail
 * - Side 6% (65px) margins
 * - Center 3:4 crop guide
 */
export const SafeZoneGuide: React.FC<SafeZoneGuideProps> = ({ show = true }) => {
  if (!show) return null;

  const topPx = 1920 * CorselaTheme.safeZone.topPercent;       // 268.8px
  const bottomPx = 1920 * CorselaTheme.safeZone.bottomPercent; // 672px
  const sidePx = 1080 * CorselaTheme.safeZone.sidePercent;     // 64.8px

  // Center 3:4 crop is 1080x1440, so (1920 - 1440)/2 = 240px top and bottom
  const cropY = (1920 - CorselaTheme.safeZone.centerCrop.height) / 2; // 240px

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {/* Top Unsafe Danger Region (Header) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${topPx}px`,
          backgroundColor: "rgba(200, 75, 34, 0.15)",
          borderBottom: "2px dashed #C84B22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#C84B22",
          fontSize: 20,
          fontWeight: "bold",
        }}
      >
        TOP UNSAFE ZONE (14% Header)
      </div>

      {/* Bottom Unsafe Danger Region (Captions & Action Rail) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: `${bottomPx}px`,
          backgroundColor: "rgba(200, 75, 34, 0.15)",
          borderTop: "2px dashed #C84B22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#C84B22",
          fontSize: 20,
          fontWeight: "bold",
        }}
      >
        BOTTOM UNSAFE ZONE (35% Audio & UI)
      </div>

      {/* Center 3:4 Profile Crop Guide */}
      <div
        style={{
          position: "absolute",
          top: `${cropY}px`,
          left: 0,
          right: 0,
          height: `${CorselaTheme.safeZone.centerCrop.height}px`,
          border: "2px dotted rgba(20, 20, 19, 0.3)",
        }}
      />

      {/* Safe Area Box */}
      <div
        style={{
          position: "absolute",
          top: `${topPx}px`,
          bottom: `${bottomPx}px`,
          left: `${sidePx}px`,
          right: `${sidePx}px`,
          border: "1px solid rgba(77, 163, 255, 0.3)",
        }}
      />
    </div>
  );
};
