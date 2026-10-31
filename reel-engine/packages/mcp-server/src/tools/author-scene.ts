import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ToolResponseEnvelope } from "../../../core/src/contracts/project-state.schema.js";
import { MCPToolHandler, ToolContext } from "./tool.interface.js";

export const authorSceneTool: MCPToolHandler = {
  name: "reel_author_scene",
  description: "Authors scene source code (TSX for Remotion or Python for Manim) into the project workspace.",
  definition: {
    name: "reel_author_scene",
    description: "Authors scene source code (TSX for Remotion or Python for Manim) into the project workspace.",
    inputSchema: {
      type: "object",
      properties: {
        scene_id: { type: "string", description: "Scene identifier (e.g. s01, s02)" },
        renderer: { type: "string", enum: ["remotion", "manim"] },
        code: { type: "string", description: "Source code of the scene component or class" },
        layout: { type: "string", description: "Layout template identifier" },
      },
      required: ["scene_id", "renderer", "code"],
    },
  },
  async execute(args: any, context: ToolContext): Promise<ToolResponseEnvelope> {
    const { scene_id, renderer, code } = args;

    const scenesDir = join(context.workDir, "scenes");
    if (!existsSync(scenesDir)) mkdirSync(scenesDir, { recursive: true });

    const ext = renderer === "manim" ? "py" : "tsx";
    const filePath = join(scenesDir, `${scene_id}.${ext}`);

    // Basic AST safety sanity check for Python Manim scenes
    if (renderer === "manim") {
      const dangerousPatterns = [
        /\bimport\s+os\b/,
        /\bimport\s+subprocess\b/,
        /\bimport\s+sys\b/,
        /\bopen\s*\(/,
        /\bexec\s*\(/,
        /\beval\s*\(/,
        /__subclasses__/,
      ];
      for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
          return {
            success: false,
            phase: "authored",
            status: "blocked",
            next_step: "reel_author_scene",
            blocked_by: [`SECURITY_VIOLATION: Manim scene code contains prohibited construct matching ${pattern}`],
            error: "Security sandbox violation",
          };
        }
      }
    }

    writeFileSync(filePath, code, "utf-8");

    context.stateManager.update({
      phase: "authored",
    });

    const state = context.stateManager.getState();
    const allScenes = state.scene_ir?.scenes || [];
    const authoredScenes = allScenes.filter((s) => {
      const p1 = join(scenesDir, `${s.id}.tsx`);
      const p2 = join(scenesDir, `${s.id}.py`);
      return existsSync(p1) || existsSync(p2);
    });

    const allAuthored = allScenes.length > 0 && authoredScenes.length === allScenes.length;

    return {
      success: true,
      phase: "authored",
      status: "ready",
      next_step: allAuthored ? "reel_render_scene" : "reel_author_scene",
      blocked_by: [],
      data: {
        scene_id,
        renderer,
        file_path: filePath,
        authored_count: authoredScenes.length,
        total_scenes: allScenes.length,
      },
    };
  },
};
