import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { AudioProcessor } from "../../packages/core/src/timing/audio-processor.js";
import { AudioAnalyzer } from "../../packages/core/src/timing/audio-analyzer.js";

const ffmpegBin = ffmpegInstaller.path;

describe("AudioProcessor Unit Tests", () => {
  const processor = new AudioProcessor();
  const analyzer = new AudioAnalyzer();
  const testDir = resolve(__dirname, "../../fixtures/.processor_test");
  const rawAudioPath = join(testDir, "raw_tone_with_pauses.wav");

  beforeAll(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });

    // Generate 6.0s audio: 2.0s tone, 1.5s silence, 2.5s tone
    const filterGraph = [
      "sine=frequency=300:duration=2.0[a1]",
      "aevalsrc=0:d=1.5[silence]",
      "sine=frequency=600:duration=2.5[a2]",
      "[a1][silence][a2]concat=n=3:v=0:a=1[outa]"
    ].join(";");

    execFileSync(ffmpegBin, [
      "-y",
      "-filter_complex", filterGraph,
      "-map", "[outa]",
      "-ar", "44100",
      "-ac", "1",
      rawAudioPath,
    ], { stdio: "pipe" });
  });

  it("should tighten pauses exceeding 0.35s down towards target duration", () => {
    const tightenedPath = join(testDir, "tightened.wav");
    const result = processor.tightenPauses(rawAudioPath, tightenedPath, 0.35, 0.25);

    expect(existsSync(tightenedPath)).toBe(true);
    expect(result.originalDuration_s).toBeCloseTo(6.0, 1);
    // The 1.5s pause should be shortened by ~1.25s, so tightened duration is ~4.75s
    expect(result.tightenedDuration_s).toBeLessThan(result.originalDuration_s - 0.5);
    expect(result.timeMap.length).toBeGreaterThanOrEqual(2);
  });

  it("should accurately map timestamps through piecewise linear timeMap", () => {
    const timeMap = [
      { original_s: 0.0, tightened_s: 0.0 },
      { original_s: 2.0, tightened_s: 2.0 },
      { original_s: 3.5, tightened_s: 2.25 },
      { original_s: 6.0, tightened_s: 4.75 },
    ];

    expect(processor.mapTimeToTightened(1.0, timeMap)).toBe(1.0);
    expect(processor.mapTimeToTightened(2.75, timeMap)).toBeCloseTo(2.125, 2);
    expect(processor.mapTimeToTightened(6.0, timeMap)).toBe(4.75);
  });

  it("should normalize audio loudness to target LUFS", () => {
    const normalizedPath = join(testDir, "normalized.wav");
    processor.normalizeLoudness(rawAudioPath, normalizedPath, -14);

    expect(existsSync(normalizedPath)).toBe(true);
    const analysis = analyzer.analyze(normalizedPath);
    // loudnorm integrated loudness should be in the target zone (-14 LUFS +/- 2dB)
    expect(analysis.integrated_lufs).toBeGreaterThanOrEqual(-16.5);
    expect(analysis.integrated_lufs).toBeLessThanOrEqual(-11.5);
    expect(analysis.clipping_detected).toBe(false);
  });
});
