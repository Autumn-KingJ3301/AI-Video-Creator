import React from "react";
import { CorselaTheme } from "../../../core/src/theme/tokens.js";

export interface EditorialCardProps {
  title?: string;
  subtitle?: string;
  chipLabel?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Editorial floating white card matching the Corsela design aesthetic.
 * Pure white card on warm ivory canvas with top terracotta accent line.
 */
export const EditorialCard: React.FC<EditorialCardProps> = ({
  title,
  subtitle,
  chipLabel,
  children,
  style,
}) => {
  return (
    <div
      style={{
        backgroundColor: CorselaTheme.colors.cardBackground,
        borderRadius: `${CorselaTheme.card.borderRadius}px`,
        border: `1px solid ${CorselaTheme.colors.cardBorder}`,
        boxShadow: `0 12px 32px ${CorselaTheme.colors.shadow}`,
        padding: `${CorselaTheme.card.padding}px`,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {/* Top Terracotta Accent Line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${CorselaTheme.card.topAccentHeight}px`,
          backgroundColor: CorselaTheme.colors.accent,
        }}
      />

      {chipLabel && (
        <div
          style={{
            display: "inline-block",
            backgroundColor: CorselaTheme.colors.chipBackground,
            color: CorselaTheme.colors.foreground,
            fontSize: "24px",
            fontWeight: 600,
            padding: "8px 20px",
            borderRadius: "999px",
            marginBottom: "24px",
          }}
        >
          {chipLabel}
        </div>
      )}

      {title && (
        <h2
          style={{
            fontSize: "52px",
            fontWeight: 800,
            color: CorselaTheme.colors.foreground,
            margin: "0 0 16px 0",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h2>
      )}

      {subtitle && (
        <p
          style={{
            fontSize: "28px",
            color: CorselaTheme.colors.muted,
            margin: "0 0 32px 0",
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      )}

      {children}
    </div>
  );
};
