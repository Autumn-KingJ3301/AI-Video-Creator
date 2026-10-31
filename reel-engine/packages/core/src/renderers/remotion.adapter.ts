import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { SceneRendererAdapter, SceneRenderInput, SceneRenderOutput } from "./renderer.interface.js";
import { probeVideo } from "../engine/vertical-slice.js";
import { buildCorselaFiltergraph } from "./corsela-filtergraph.js";

const ffmpegBin = ffmpegInstaller.path;

export class RemotionAdapter implements SceneRendererAdapter {
  readonly name = "remotion" as const;

  async renderScene(input: SceneRenderInput): Promise<SceneRenderOutput> {
    const startTime = Date.now();
    const { scene, config, workDir } = input;
    const durationFrames = scene.end_frame - scene.start_frame;
    const fps = config.format.fps;
    const durationSeconds = durationFrames / fps;
    const width = config.format.width;
    const height = config.format.height;

    const clipsDir = join(workDir, "clips");
    if (!existsSync(clipsDir)) mkdirSync(clipsDir, { recursive: true });
    const clipPath = join(clipsDir, `${scene.id}.mp4`);

    const filterGraph = buildCorselaFiltergraph(scene, fps, durationSeconds, width, height);

    const renderArgs = [
      "-y",
      "-f", "lavfi",
      "-i", filterGraph,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-r", String(fps),
      "-t", String(durationSeconds),
      clipPath
    ];

    execFileSync(ffmpegBin, renderArgs, { stdio: "pipe" });

    const probe = probeVideo(clipPath);

    return {
      sceneId: scene.id,
      clipPath,
      durationFrames: probe.nbFrames,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      renderer: "remotion",
      renderDurationMs: Date.now() - startTime,
    };
  }
}
