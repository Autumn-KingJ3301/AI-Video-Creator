import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { SceneRendererAdapter, SceneRenderInput, SceneRenderOutput } from "./renderer.interface.js";
import { probeVideo } from "../engine/vertical-slice.js";

const execFileAsync = promisify(execFile);

export class ManimAdapter implements SceneRendererAdapter {
  readonly name = "manim" as const;

  /**
   * Locates the renderer.py worker script across workspace layouts.
   */
  private findWorkerScript(): string {
    const candidatePaths = [
      resolve(process.cwd(), "packages/manim-renderer/manim_worker/renderer.py"),
      resolve(process.cwd(), "reel-engine/packages/manim-renderer/manim_worker/renderer.py"),
      resolve(__dirname, "../../manim-renderer/manim_worker/renderer.py"),
      resolve(__dirname, "../../../manim-renderer/manim_worker/renderer.py"),
    ];

    for (const p of candidatePaths) {
      if (existsSync(p)) return p;
    }

    throw new Error(
      `Could not locate manim_worker/renderer.py. Searched candidate paths:\n${candidatePaths.join("\n")}`
    );
  }

  async renderScene(input: SceneRenderInput): Promise<SceneRenderOutput> {
    const startTime = Date.now();
    const { scene, config, workDir, sourceCodePath } = input;
    const durationFrames = scene.end_frame - scene.start_frame;
    const fps = config.format.fps;
    const clipsDir = join(workDir, "clips");

    if (!existsSync(clipsDir)) {
      mkdirSync(clipsDir, { recursive: true });
    }
    const clipPath = join(clipsDir, `${scene.id}.mp4`);

    // Determine Python script to render
    let scriptPath = sourceCodePath;
    if (!scriptPath || !existsSync(scriptPath)) {
      const candidateScript = join(workDir, `${scene.id}.py`);
      const fallbackScript = join(workDir, "math_scene.py");

      if (existsSync(candidateScript)) {
        scriptPath = candidateScript;
      } else if (existsSync(fallbackScript)) {
        scriptPath = fallbackScript;
      } else {
        // Generate a standard vertical ReelScene script in the workDir
        scriptPath = candidateScript;
        const defaultScriptContent = `
from manim_worker.helpers import ReelScene

class Scene_${scene.id}(ReelScene):
    """Auto-generated vertical mathematical scene for ${scene.id}"""
    def construct(self):
        pass
`;
        writeFileSync(scriptPath, defaultScriptContent.trim(), "utf-8");
      }
    }

    const workerScript = this.findWorkerScript();
    const sceneName = `Scene_${scene.id}`;
    const pythonBin = process.env.PYTHON_BIN || "python";

    const args = [
      workerScript,
      "--script", scriptPath,
      "--scene", sceneName,
      "--output", clipPath,
      "--frames", String(durationFrames),
      "--fps", String(fps),
    ];

    try {
      await execFileAsync(pythonBin, args);
    } catch (err: any) {
      throw new Error(`Manim render failed for scene ${scene.id}: ${err.stderr || err.message}`);
    }

    if (!existsSync(clipPath)) {
      throw new Error(`Manim renderer completed but clip was not created at: ${clipPath}`);
    }

    const probe = probeVideo(clipPath);

    return {
      sceneId: scene.id,
      clipPath,
      durationFrames: probe.nbFrames,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      renderer: "manim",
      renderDurationMs: Date.now() - startTime,
    };
  }
}
