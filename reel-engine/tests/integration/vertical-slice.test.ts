import { describe, it, expect } from "vitest";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { executeVerticalSlice, probeVideo } from "../../packages/core/src/engine/vertical-slice.js";

describe("Build Phase A: Vertical Slice Execution", () => {
  const fixtureDir = resolve(__dirname, "../../fixtures/quick-tip-15s");
  const testWorkDir = resolve(__dirname, "../../fixtures/quick-tip-15s/.test_run");

  it("should execute hand-authored 15-second reel end-to-end with exact frame counts and zero drift", async () => {
    // Clean any prior test run
    if (existsSync(testWorkDir)) {
      rmSync(testWorkDir, { recursive: true, force: true });
    }

    const irJsonPath = join(fixtureDir, "scene-ir.json");
    const rawIR = JSON.parse(readFileSync(irJsonPath, "utf-8"));

    const result = await executeVerticalSlice(rawIR, testWorkDir);

    expect(result.outputPath).toBeDefined();
    expect(existsSync(result.outputPath)).toBe(true);

    // 1. Verify that 4 independent scene clips were created (REQ-REN-03)
    expect(result.sceneClipPaths.length).toBe(4);
    for (const clipPath of result.sceneClipPaths) {
      expect(existsSync(clipPath)).toBe(true);
    }

    // 2. Probe scene clips and verify per-scene duration (REQ-QA-02)
    const clip1 = probeVideo(result.sceneClipPaths[0]);
    expect(clip1.nbFrames).toBe(60); // 0 to 60 (2.0s)
    expect(clip1.width).toBe(1080);
    expect(clip1.height).toBe(1920);

    const clip2 = probeVideo(result.sceneClipPaths[1]);
    expect(clip2.nbFrames).toBe(150); // 60 to 210 (5.0s)

    const clip3 = probeVideo(result.sceneClipPaths[2]);
    expect(clip3.nbFrames).toBe(150); // 210 to 360 (5.0s)

    const clip4 = probeVideo(result.sceneClipPaths[3]);
    expect(clip4.nbFrames).toBe(90); // 360 to 450 (3.0s)

    // 3. Probe final composed output video (REQ-001, REQ-CMP-01)
    const finalProbe = probeVideo(result.outputPath);
    expect(finalProbe.width).toBe(1080);
    expect(finalProbe.height).toBe(1920);
    expect(finalProbe.fps).toBe(30);
    expect(finalProbe.nbFrames).toBe(450); // Exact 450 frames @ 30fps
    expect(Math.abs(finalProbe.duration - 15.0)).toBeLessThan(0.05); // 15.0s
    expect(finalProbe.hasAudio).toBe(true);
    expect(finalProbe.videoCodec).toBe("h264");
  }, 30000); // 30s timeout for rendering
});
