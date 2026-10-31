import { describe, it, expect } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { TTSService } from "../../packages/core/src/timing/tts.service.js";

describe("TTSService Unit Tests", () => {
  const tts = new TTSService();
  const testDir = resolve(__dirname, "../../fixtures/.tts_test");

  it("should synthesize narration audio file from script text with positive duration", async () => {
    const outAudio = join(testDir, "synth_output.wav");
    if (existsSync(outAudio)) rmSync(outAudio, { force: true });

    const script = "AI generated code? Get a code audit. Launch confidently.";
    const result = await tts.synthesize(script, outAudio);

    expect(existsSync(result.outputPath)).toBe(true);
    expect(result.duration_s).toBeGreaterThan(1.0);
    expect(result.wordCount).toBe(9);
  });
});
