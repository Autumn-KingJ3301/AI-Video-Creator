import { describe, it, expect } from "vitest";
import { ContrastEvaluator } from "../../packages/core/src/qa/contrast.js";
import { CorselaTheme } from "../../packages/core/src/theme/tokens.js";

describe("ContrastEvaluator Unit Tests", () => {
  it("should calculate WCAG relative luminance correctly", () => {
    // Pure black and pure white
    expect(ContrastEvaluator.calculateLuminance("#000000")).toBeCloseTo(0.0, 3);
    expect(ContrastEvaluator.calculateLuminance("#FFFFFF")).toBeCloseTo(1.0, 3);
  });

  it("should calculate contrast ratios matching WCAG 2.1 formulas", () => {
    // Black on white is 21.0:1
    expect(ContrastEvaluator.calculateContrastRatio("#000000", "#FFFFFF")).toBe(21.0);
    // Identical colors is 1.0:1
    expect(ContrastEvaluator.calculateContrastRatio("#FFFFFF", "#FFFFFF")).toBe(1.0);
  });

  it("should verify that Corsela theme tokens meet WCAG AA standards", () => {
    const bg = CorselaTheme.colors.background; // #F4F0EA
    const fg = CorselaTheme.colors.foreground; // #141413
    const accent = CorselaTheme.colors.accent; // #C84B22
    const border = CorselaTheme.colors.cardBorder; // #E6E0D5

    // Dark charcoal on warm ivory is extremely legible (~16:1)
    const charcoalRatio = ContrastEvaluator.calculateContrastRatio(fg, bg);
    expect(charcoalRatio).toBeGreaterThanOrEqual(14.0);
    expect(ContrastEvaluator.meetsWcagAA(fg, bg)).toBe(true);

    // Terracotta accent on warm ivory passes WCAG AA for large text / headlines (~4.12:1 >= 3.0:1)
    const terracottaRatio = ContrastEvaluator.calculateContrastRatio(accent, bg);
    expect(terracottaRatio).toBeGreaterThanOrEqual(4.0);
    expect(ContrastEvaluator.meetsWcagAA(accent, bg, true)).toBe(true);

    // Warm border is low contrast and should fail text contrast (~1.2:1)
    const borderRatio = ContrastEvaluator.calculateContrastRatio(border, bg);
    expect(borderRatio).toBeLessThan(2.0);
    expect(ContrastEvaluator.meetsWcagAA(border, bg)).toBe(false);
  });
});
