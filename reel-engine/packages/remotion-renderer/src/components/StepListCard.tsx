import React from "react";
import { CorselaTheme } from "../../../core/src/theme/tokens.js";
import { EditorialCard } from "./EditorialCard.js";

export interface StepItem {
  number: string; // e.g. "01", "02", "03"
  title: string;
  description: string;
}

export interface StepListCardProps {
  cardTitle?: string;
  steps: StepItem[];
  activeStepIndex?: number;
  style?: React.CSSProperties;
}

/**
 * Numbered Step List Card matching the Corsela reference design:
 * Features bold terracotta step numbers (01, 02, 03), charcoal headlines,
 * and muted descriptions divided by subtle warm border lines.
 */
export const StepListCard: React.FC<StepListCardProps> = ({
  cardTitle = "Your audit includes",
  steps,
  activeStepIndex = 999, // by default show all
  style,
}) => {
  return (
    <EditorialCard title={cardTitle} style={style}>
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {steps.map((step, idx) => {
          const isVisible = idx <= activeStepIndex;
          if (!isVisible) return null;

          return (
            <div
              key={step.number}
              style={{
                borderTop: idx > 0 ? `1px solid ${CorselaTheme.colors.cardBorder}` : "none",
                paddingTop: idx > 0 ? "24px" : "0",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
                <span
                  style={{
                    color: CorselaTheme.colors.accent,
                    fontSize: "28px",
                    fontWeight: CorselaTheme.typography.stepIndexFontWeight,
                    fontFamily: CorselaTheme.typography.mono,
                  }}
                >
                  {step.number}
                </span>
                <span
                  style={{
                    color: CorselaTheme.colors.foreground,
                    fontSize: "32px",
                    fontWeight: 700,
                  }}
                >
                  {step.title}
                </span>
              </div>
              <p
                style={{
                  margin: "0 0 0 44px",
                  fontSize: "24px",
                  color: CorselaTheme.colors.muted,
                  lineHeight: 1.35,
                }}
              >
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </EditorialCard>
  );
};
