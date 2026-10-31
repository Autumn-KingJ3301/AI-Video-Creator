/**
 * WCAG 2.1 Relative Luminance and Contrast Ratio Evaluator
 */

export class ContrastEvaluator {
  /**
   * Converts a 6-character hex color (e.g. "#F4F0EA" or "F4F0EA") to RGB tuple [0-255].
   */
  static hexToRgb(hex: string): [number, number, number] {
    const cleanHex = hex.replace(/^#/, "");
    if (cleanHex.length !== 6) {
      throw new Error(`Invalid hex color: ${hex}`);
    }
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return [r, g, b];
  }

  /**
   * Computes sRGB linear relative luminance according to WCAG 2.1 specs.
   * Luminance ranges from 0.0 (pure black) to 1.0 (pure white).
   */
  static calculateLuminance(hex: string): number {
    const [r, g, b] = this.hexToRgb(hex);

    const linearize = (c: number): number => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };

    const rLin = linearize(r);
    const gLin = linearize(g);
    const bLin = linearize(b);

    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  }

  /**
   * Calculates the contrast ratio between two hex colors.
   * Returns a value between 1.0 (no contrast) and 21.0 (maximum contrast).
   */
  static calculateContrastRatio(fgHex: string, bgHex: string): number {
    const l1 = this.calculateLuminance(fgHex);
    const l2 = this.calculateLuminance(bgHex);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    const ratio = (lighter + 0.05) / (darker + 0.05);
    return Number(ratio.toFixed(2));
  }

  /**
   * Evaluates if contrast ratio meets WCAG AA standards:
   * - Normal text: >= 4.5:1
   * - Large text (>= 18pt or >= 14pt bold): >= 3.0:1
   */
  static meetsWcagAA(fgHex: string, bgHex: string, isLargeText: boolean = false): boolean {
    const ratio = this.calculateContrastRatio(fgHex, bgHex);
    const threshold = isLargeText ? 3.0 : 4.5;
    return ratio >= threshold;
  }
}
