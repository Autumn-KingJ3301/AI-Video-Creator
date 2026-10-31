import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

import { RemotionAdapter } from "../../packages/core/src/renderers/remotion.adapter.js";
import { ManimAdapter } from "../../packages/core/src/renderers/manim.adapter.js";
import { SceneIRSchema } from "../../packages/core/src/contracts/scene-ir.schema.js";
import { ProjectConfigSchema } from "../../packages/core/src/contracts/project-config.schema.js";
import { probeVideo } from "../../packages/core/src/engine/vertical-slice.js";
import { CorselaTheme } from "../../packages/core/src/theme/tokens.js";

const ffmpegBin = ffmpegInstaller.path;

/**
 * Samples RGB color from a single pixel (x, y) at 0.5s into the video.
 */
function samplePixelRgb(videoPath: string, x: number, y: number): [number, number, number] {
  const rawBytes = execFileSync(ffmpegBin, [
    "-ss", "0.5",
    "-i", videoPath,
    "-vframes", "1",
    "-vf", `crop=1:1:${x}:${y},format=rgb24`,
    "-f", "rawvideo",
    "-"
  ]);
  return [rawBytes[0], rawBytes[1], rawBytes[2]];
}

describe("Build Phase B: Hybrid Corsela Multi-Renderer Reel", () => {
  const fixtureDir = resolve(__dirname, "../../fixtures/hybrid-30s-corsela");
  const testWorkDir = resolve(__dirname, "../../fixtures/hybrid-30s-corsela/.test_run");

  it("should render Remotion + Manim scenes matching Corsela palette and compose exact 30s 900-frame reel", async () => {
    // 1. Clean test work directory
    if (existsSync(testWorkDir)) {
      rmSync(testWorkDir, { recursive: true, force: true });
    }
    mkdirSync(testWorkDir, { recursive: true });

    // 2. Validate Scene IR against contract
    const irPath = join(fixtureDir, "scene-ir.json");
    const rawIR = JSON.parse(readFileSync(irPath, "utf-8"));
    const sceneIR = SceneIRSchema.parse(rawIR);
    const config = ProjectConfigSchema.parse({});

    expect(sceneIR.total_frames).toBe(900);
    expect(sceneIR.scenes.length).toBe(4);

    const remotionAdapter = new RemotionAdapter();
    const manimAdapter = new ManimAdapter();

    const renderedClips: string[] = [];

    // 3. Render each scene with designated adapter
    for (const scene of sceneIR.scenes) {
      if (scene.renderer === "remotion") {
        const out = await remotionAdapter.renderScene({
          scene,
          config,
          workDir: testWorkDir,
        });
        expect(out.renderer).toBe("remotion");
        expect(out.durationFrames).toBe(scene.end_frame - scene.start_frame);
        expect(out.width).toBe(1080);
        expect(out.height).toBe(1920);
        expect(existsSync(out.clipPath)).toBe(true);
        renderedClips.push(out.clipPath);
      } else if (scene.renderer === "manim") {
        const out = await manimAdapter.renderScene({
          scene,
          config,
          workDir: testWorkDir,
          sourceCodePath: join(fixtureDir, "math_scene.py"),
        });
        expect(out.renderer).toBe("manim");
        expect(out.durationFrames).toBe(scene.end_frame - scene.start_frame);
        expect(out.width).toBe(1080);
        expect(out.height).toBe(1920);
        expect(existsSync(out.clipPath)).toBe(true);
        renderedClips.push(out.clipPath);
      }
    }

    expect(renderedClips.length).toBe(4);

    // 4. Verify visual consistency across renderers (Corsela Warm Ivory #F4F0EA)
    // #F4F0EA in RGB: R=244, G=240, B=234
    // Pixel sample at (20, 20) in safe margin of Remotion hook scene (s01)
    const remotionRgb = samplePixelRgb(renderedClips[0], 20, 20);
    expect(Math.abs(remotionRgb[0] - 244)).toBeLessThanOrEqual(5);
    expect(Math.abs(remotionRgb[1] - 240)).toBeLessThanOrEqual(5);
    expect(Math.abs(remotionRgb[2] - 234)).toBeLessThanOrEqual(5);

    // Pixel sample at (20, 20) of Manim math scene (s03)
    const manimRgb = samplePixelRgb(renderedClips[2], 20, 20);
    expect(Math.abs(manimRgb[0] - 244)).toBeLessThanOrEqual(5);
    expect(Math.abs(manimRgb[1] - 240)).toBeLessThanOrEqual(5);
    expect(Math.abs(manimRgb[2] - 234)).toBeLessThanOrEqual(5);

    // 5. Generate 30.0s master narration track (440Hz tone)
    const audioPath = join(testWorkDir, "narration_30s.wav");
    execFileSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=440:duration=30.0",
      "-af", "volume=0.25",
      audioPath,
    ]);

    // 6. Concatenate clips and mux audio
    const concatListPath = join(testWorkDir, "concat_list.txt");
    const concatContent = renderedClips.map(p => `file '${p.replace(/\\/g, "/")}'`).join("\n");
    writeFileSync(concatListPath, concatContent, "utf-8");

    const finalOutDir = join(testWorkDir, "out");
    mkdirSync(finalOutDir, { recursive: true });
    const finalMp4Path = join(finalOutDir, "hybrid-30s-corsela.mp4");

    execFileSync(ffmpegBin, [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
      "-i", audioPath,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      finalMp4Path,
    ]);

    // 7. Rigorous Quality Gate Assertions
    const finalProbe = probeVideo(finalMp4Path);
    expect(finalProbe.width).toBe(1080);
    expect(finalProbe.height).toBe(1920);
    expect(finalProbe.fps).toBe(30);
    expect(finalProbe.nbFrames).toBe(900); // Exact 900 frames
    expect(Math.abs(finalProbe.duration - 30.0)).toBeLessThan(0.05); // 30.0s
    expect(finalProbe.hasAudio).toBe(true);
    expect(finalProbe.videoCodec).toBe("h264");
  }, 45000); // 45s timeout for complete 30s multi-scene render
});
