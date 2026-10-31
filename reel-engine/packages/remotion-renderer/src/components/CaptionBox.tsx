import React from "react";
import { CorselaTheme } from "../../../core/src/theme/tokens.js";

export interface CaptionWord {
  text: string;
  isKeyword?: boolean;
}

export interface CaptionBoxProps {
  words: CaptionWord[];
  position?: "upper_mid" | "center" | "lower_mid";
}

/**
 * Phrase-based Caption Box positioned strictly in the upper-mid safe zone.
 * Highlights key terms with a terracotta pill background.
 */
export const CaptionBox: React.FC<CaptionBoxProps> = ({
  words,
  position = "upper_mid",
}) => {
  // Safe zone bounds: 14% top = 269px, 35% bottom = 672px
  let topPosition = "340px"; // Default upper_mid (between header 269px and center 960px)
  if (position === "center") topPosition = "750px";
  if (position === "lower_mid") topPosition = "1050px";

  return (
    <div
      style={{
        position: "absolute",
        top: topPosition,
        left: "65px",
        right: "65px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: "12px",
        zIndex: 50,
      }}
    >
      {words.map((w, idx) => {
        if (w.isKeyword) {
          return (
            <span
              key={idx}
              style={{
                backgroundColor: CorselaTheme.colors.accent,
                color: "#FFFFFF",
                fontSize: "38px",
                fontWeight: 800,
                padding: "6px 18px",
                borderRadius: "12px",
                boxShadow: `0 4px 14px ${CorselaTheme.colors.shadow}`,
              }}
            >
              {w.text}
            </span>
          );
        }

        return (
          <span
            key={idx}
            style={{
              color: CorselaTheme.colors.foreground,
              fontSize: "36px",
              fontWeight: 700,
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              padding: "4px 10px",
              borderRadius: "8px",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};
