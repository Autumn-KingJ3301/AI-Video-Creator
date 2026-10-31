import { describe, it, expect } from "vitest";
import { CorselaTheme } from "../../packages/core/src/theme/tokens.js";

describe("Corsela Editorial Theme Tokens", () => {
  it("should have correct color values matching the Corsela brand palette", () => {
    expect(CorselaTheme.colors.background).toBe("#F4F0EA");
    expect(CorselaTheme.colors.foreground).toBe("#141413");
    expect(CorselaTheme.colors.accent).toBe("#C84B22");
    expect(CorselaTheme.colors.cardBackground).toBe("#FFFFFF");
    expect(CorselaTheme.colors.muted).toBe("#6E6962");
  });

  it("should enforce safe zone percentages compliant with Instagram Reels", () => {
    expect(CorselaTheme.safeZone.topPercent).toBe(0.14);
    expect(CorselaTheme.safeZone.bottomPercent).toBe(0.35);
    expect(CorselaTheme.safeZone.sidePercent).toBe(0.06);
    expect(CorselaTheme.safeZone.centerCrop.width).toBe(1080);
    expect(CorselaTheme.safeZone.centerCrop.height).toBe(1440);
  });
});
