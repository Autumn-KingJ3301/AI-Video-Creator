import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { AudioAnalyzer } from "../../packages/core/src/timing/audio-analyzer.js";

const ffmpegBin = ffmpegInstaller.path;

describe("AudioAnalyzer Unit Tests", () => {
  const analyzer = new AudioAnalyzer();
  const testDir = resolve(__dirname, "../../fixtures/.audio_test");
  const testAudioPath = join(testDir, "test_tone_silence.wav");

  beforeAll(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });

    // Generate a 4.0s test audio file: 1.5s tone + 1.0s silence + 1.5s tone
    const filterGraph = [
      "sine=frequency=440:duration=1.5[a1]",
      "aevalsrc=0:d=1.0[silence]",
      "sine=frequency=440:duration=1.5[a2]",
      "[a1][silence][a2]concat=n=3:v=0:a=1[outa]"
    ].join(";");

    execFileSync(ffmpegBin, [
      "-y",
      "-filter_complex", filterGraph,
      "-map", "[outa]",
      "-ar", "44100",
      "-ac", "1",
      testAudioPath,
    ], { stdio: "pipe" });
  });

  it("should accurately measure audio duration", () => {
    const duration = analyzer.getDuration(testAudioPath);
    expect(Math.abs(duration - 4.0)).toBeLessThan(0.1);
  });

  it("should detect the 1.0s silence interval between 1.5s and 2.5s", () => {
    const silences = analyzer.detectSilences(testAudioPath, -30, 0.35);
    expect(silences.length).toBeGreaterThanOrEqual(1);
    const silence = silences[0];
    expect(silence.start_s).toBeGreaterThanOrEqual(1.3);
    expect(silence.start_s).toBeLessThanOrEqual(1.7);
    expect(silence.duration_s).toBeGreaterThanOrEqual(0.8);
    expect(silence.duration_s).toBeLessThanOrEqual(1.2);
  });

  it("should measure loudness metrics (LUFS and True Peak)", () => {
    const loudness = analyzer.measureLoudness(testAudioPath);
    expect(loudness.integrated_lufs).toBeDefined();
    expect(typeof loudness.integrated_lufs).toBe("number");
    expect(loudness.true_peak_db).toBeDefined();
    expect(typeof loudness.true_peak_db).toBe("number");
  });

  it("should return complete AudioAnalysis with clipping status", () => {
    const analysis = analyzer.analyze(testAudioPath);
    expect(analysis.duration_s).toBeCloseTo(4.0, 1);
    expect(analysis.silences.length).toBeGreaterThanOrEqual(1);
    expect(analysis.clipping_detected).toBe(false);
  });
});
