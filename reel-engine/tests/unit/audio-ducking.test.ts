import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AudioMixer } from "../../packages/core/src/composer/audio-mixer.js";
import { AudioAnalyzer } from "../../packages/core/src/timing/audio-analyzer.js";

const ffmpegBin = ffmpegInstaller.path;

describe("AudioMixer & Ducking Unit Tests", () => {
  const testDir = join(process.cwd(), ".test_ducking_run");
  const mixer = new AudioMixer();
  const analyzer = new AudioAnalyzer();

  beforeEach(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should mix narration with background music, ducking music and normalizing to -14 LUFS", () => {
    const speechPath = join(testDir, "test_speech.wav");
    const musicPath = join(testDir, "test_music.wav");
    const outputPath = join(testDir, "test_mixed.wav");

    // Generate 3s speech audio (sine tone)
    spawnSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=440:duration=3",
      "-af", "volume=0.8",
      "-ar", "44100",
      speechPath,
    ]);

    // Generate 3s background music audio (lower frequency sine)
    spawnSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=220:duration=3",
      "-af", "volume=0.5",
      "-ar", "44100",
      musicPath,
    ]);

    const result = mixer.mix({
      speechPath,
      musicPath,
      outputPath,
      duckMusicDb: -12,
      targetLufs: -14.0,
      targetDurationSeconds: 3.0,
    });

    expect(existsSync(outputPath)).toBe(true);
    expect(result.ducked).toBe(true);
    expect(result.durationSeconds).toBeCloseTo(3.0, 1);

    // Integrated loudness target is -14.0 LUFS
    expect(result.integratedLufs).toBeGreaterThanOrEqual(-16.0);
    expect(result.integratedLufs).toBeLessThanOrEqual(-12.0);

    // True peak must not clip
    expect(result.truePeakDb).toBeLessThanOrEqual(-0.5);
  });

  it("should handle speech-only track when no music is supplied", () => {
    const speechPath = join(testDir, "speech_only.wav");
    const outputPath = join(testDir, "speech_normalized.wav");

    spawnSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=440:duration=2",
      "-af", "volume=0.5",
      "-ar", "44100",
      speechPath,
    ]);

    const result = mixer.mix({
      speechPath,
      outputPath,
      targetLufs: -14.0,
      targetDurationSeconds: 2.0,
    });

    expect(existsSync(outputPath)).toBe(true);
    expect(result.ducked).toBe(false);
    expect(result.durationSeconds).toBeCloseTo(2.0, 1);
  });
});
