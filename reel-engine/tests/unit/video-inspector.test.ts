import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { VideoInspector } from "../../packages/core/src/qa/video-inspector.js";

const ffmpegBin = ffmpegInstaller.path;

describe("VideoInspector Unit Tests", () => {
  const inspector = new VideoInspector();
  const testDir = resolve(__dirname, "../../fixtures/.inspector_test");
  const frozenClipPath = join(testDir, "frozen_clip.mp4");
  const blackClipPath = join(testDir, "black_clip.mp4");
  const movingClipPath = join(testDir, "moving_clip.mp4");
  const clippedAudioPath = join(testDir, "clipped_audio.wav");

  beforeAll(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });

    // 1. Frozen 3.0s clip (completely static red screen)
    execFileSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "color=c=red:s=320x240:d=3.0:r=30",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      frozenClipPath,
    ], { stdio: "pipe" });

    // 2. Black 1.0s clip
    execFileSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "color=c=black:s=320x240:d=1.0:r=30",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      blackClipPath,
    ], { stdio: "pipe" });

    // 3. Moving 3.0s clip using testsrc (continuously changing clock hand and frame count)
    execFileSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "testsrc=duration=3.0:size=320x240:rate=30",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      movingClipPath,
    ], { stdio: "pipe" });

    // 4. Clipped audio (overdriven sine wave peaking well above -0.5 dBFS)
    execFileSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=1000:duration=1.5",
      "-af", "volume=50.0",
      "-ar", "44100",
      "-ac", "1",
      clippedAudioPath,
    ], { stdio: "pipe" });
  });

  it("should block when clip file is missing", () => {
    const violations = inspector.inspectClip({
      clipPath: join(testDir, "non_existent.mp4"),
      sceneId: "s01",
      expectedFrames: 90,
      fps: 30,
    });

    expect(violations.some(v => v.gate_id === "GATE_RENDER_COMPLETION")).toBe(true);
  });

  it("should block when rendered frame count mismatches expected frames", () => {
    // movingClipPath has 90 frames, expected is 150
    const violations = inspector.inspectClip({
      clipPath: movingClipPath,
      sceneId: "s01",
      expectedFrames: 150,
      fps: 30,
    });

    expect(violations.some(v => v.gate_id === "GATE_DURATION_MATCH")).toBe(true);
  });

  it("should block when visual stillness (frozen video) exceeds maxStaticSeconds", () => {
    const violations = inspector.inspectClip({
      clipPath: frozenClipPath,
      sceneId: "s01",
      expectedFrames: 90,
      fps: 30,
      maxStaticSeconds: 2.0,
    });

    expect(violations.some(v => v.gate_id === "GATE_STATIC_LIMIT")).toBe(true);
  });

  it("should block when all-black sequence exceeds 0.5s", () => {
    const violations = inspector.inspectClip({
      clipPath: blackClipPath,
      sceneId: "s01",
      expectedFrames: 30,
      fps: 30,
    });

    expect(violations.some(v => v.gate_id === "GATE_BLACK_OR_FROZEN")).toBe(true);
  });

  it("should block when audio clipping is detected", () => {
    const violations = inspector.inspectAudio(clippedAudioPath, -14);
    expect(violations.some(v => v.gate_id === "GATE_AUDIO_LOUDNESS_CLIPPING" && v.violation_type === "audio_clipping_detected")).toBe(true);
  });

  it("should pass cleanly on moving clip with matching frames", () => {
    const violations = inspector.inspectClip({
      clipPath: movingClipPath,
      sceneId: "s01",
      expectedFrames: 90,
      fps: 30,
      maxStaticSeconds: 2.5,
    });

    expect(violations.length).toBe(0);
  });
});
