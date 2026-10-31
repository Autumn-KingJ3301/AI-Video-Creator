import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { computeSceneCacheKey } from "../../../core/src/cache/cache-key.js";
import { ToolResponseEnvelope } from "../../../core/src/contracts/project-state.schema.js";
import { buildCorselaFiltergraph } from "../../../core/src/renderers/corsela-filtergraph.js";
import { ManimAdapter } from "../../../core/src/renderers/manim.adapter.js";
import { MCPToolHandler, ToolContext } from "./tool.interface.js";

const ffmpegBin = ffmpegInstaller.path;

export const renderSceneTool: MCPToolHandler = {
  name: "reel_render_scene",
  description: "Renders independent scene clips to disk with smart content-addressed caching (0s for unchanged cached clips).",
  definition: {
    name: "reel_render_scene",
    description: "Renders independent scene clips to disk with smart content-addressed caching (0s for unchanged cached clips).",
    inputSchema: {
      type: "object",
      properties: {
        scene_id: { type: "string", description: "Scene identifier to render (e.g. s01). If omitted, renders all scenes." },
        force: { type: "boolean", description: "Force re-render bypassing cache", default: false },
      },
    },
  },
  async execute(args: any, context: ToolContext): Promise<ToolResponseEnvelope> {
    const state = context.stateManager.getState();
    const sceneIR = state.scene_ir;

    if (!sceneIR || sceneIR.scenes.length === 0) {
      return {
        success: false,
        phase: state.phase,
        status: "blocked",
        next_step: "reel_plan_scenes",
        blocked_by: ["MISSING_SCENE_IR: Cannot render without a valid Scene IR"],
        error: "Missing Scene IR",
      };
    }

    const clipsDir = join(context.workDir, "clips");
    const scenesDir = join(context.workDir, "scenes");
    if (!existsSync(clipsDir)) mkdirSync(clipsDir, { recursive: true });

    const targetSceneIds = args.scene_id
      ? [args.scene_id]
      : sceneIR.scenes.map((s) => s.id);

    const renderedClips = { ...state.rendered_clips };
    const results: Array<{ scene_id: string; cached: boolean; clip_path: string }> = [];

    for (const scId of targetSceneIds) {
      const scene = sceneIR.scenes.find((s) => s.id === scId);
      if (!scene) continue;

      // Check for authored source code
      const tsxPath = join(scenesDir, `${scId}.tsx`);
      const pyPath = join(scenesDir, `${scId}.py`);
      let sourceCode = "";
      if (existsSync(tsxPath)) sourceCode = readFileSync(tsxPath, "utf-8");
      else if (existsSync(pyPath)) sourceCode = readFileSync(pyPath, "utf-8");

      const cacheKey = computeSceneCacheKey({
        scene,
        code: sourceCode,
        themeTokens: state.config.style,
        audioPath: state.audio_path,
      });

      const isCached = !args.force && context.cache.has(cacheKey);

      if (isCached) {
        const cachedPath = context.cache.get(cacheKey)!;
        renderedClips[scId] = cachedPath;
        results.push({ scene_id: scId, cached: true, clip_path: cachedPath });
      } else {
        // Render clip to clipsDir
        const clipPath = join(clipsDir, `${scId}.mp4`);
        const durationFrames = scene.end_frame - scene.start_frame;
        const durationSec = durationFrames / sceneIR.fps;

        if (scene.renderer === "manim") {
          const manimAdapter = new ManimAdapter();
          await manimAdapter.renderScene({
            scene,
            config: state.config,
            workDir: context.workDir,
            sourceCodePath: existsSync(pyPath) ? pyPath : undefined,
          });
        } else {
          // Render rich Corsela editorial animated scene
          const filter = buildCorselaFiltergraph(scene, sceneIR.fps, durationSec);

          const renderArgs = [
            "-y",
            "-f", "lavfi",
            "-i", filter,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-r", String(sceneIR.fps),
            "-t", String(durationSec),
            clipPath,
          ];

          const res = spawnSync(ffmpegBin, renderArgs, { encoding: "utf-8" });
          if (res.status !== 0) {
            return {
              success: false,
              phase: "authored",
              status: "failed",
              next_step: "reel_author_scene",
              blocked_by: [`RENDER_FAILURE: Failed to render scene ${scId}: ${res.stderr}`],
              error: res.stderr,
            };
          }
        }

        // Cache clip
        const storedPath = context.cache.put(cacheKey, clipPath, { sceneId: scId });
        renderedClips[scId] = storedPath;
        results.push({ scene_id: scId, cached: false, clip_path: storedPath });
      }
    }

    const allScenesRendered = sceneIR.scenes.every((s) => !!renderedClips[s.id]);

    context.stateManager.update({
      phase: allScenesRendered ? "rendered" : state.phase,
      rendered_clips: renderedClips,
    });

    return {
      success: true,
      phase: allScenesRendered ? "rendered" : state.phase,
      status: "ready",
      next_step: allScenesRendered ? "reel_verify_quality" : "reel_render_scene",
      blocked_by: [],
      data: {
        rendered_count: results.length,
        scenes: results,
        all_rendered: allScenesRendered,
      },
    };
  },
};
