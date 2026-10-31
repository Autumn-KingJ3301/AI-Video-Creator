import React from "react";
import { CorselaTheme } from "../../../core/src/theme/tokens.js";

export interface ReelCanvasProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  backgroundColor?: string;
}

/**
 * 1080x1920 Vertical Canvas Container in Corsela Editorial Theme.
 */
export const ReelCanvas: React.FC<ReelCanvasProps> = ({
  children,
  width = 1080,
  height = 1920,
  backgroundColor = CorselaTheme.colors.background,
}) => {
  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor,
        color: CorselaTheme.colors.foreground,
        fontFamily: CorselaTheme.typography.body,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
};
