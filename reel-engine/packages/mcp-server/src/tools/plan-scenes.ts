import { SceneIRSchema } from "../../../core/src/contracts/scene-ir.schema.js";
import { ToolResponseEnvelope } from "../../../core/src/contracts/project-state.schema.js";
import { MCPToolHandler, ToolContext } from "./tool.interface.js";

export const planScenesTool: MCPToolHandler = {
  name: "reel_plan_scenes",
  description: "Submits and validates a Scene Intermediate Representation (IR), enforcing contiguous frame boundaries and required scene types.",
  definition: {
    name: "reel_plan_scenes",
    description: "Submits and validates a Scene Intermediate Representation (IR), enforcing contiguous frame boundaries and required scene types.",
    inputSchema: {
      type: "object",
      properties: {
        core_idea: { type: "string", description: "The single clear proposition of the video" },
        fps: { type: "integer", default: 30 },
        scenes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              type: { type: "string", enum: ["hook", "setup", "beat", "proof", "reset", "payoff", "cta_loop"] },
              start_frame: { type: "integer" },
              end_frame: { type: "integer" },
              narration: { type: "string" },
              intent: { type: "string" },
              renderer: { type: "string", enum: ["remotion", "manim"] },
              layout: { type: "string" },
              transition_in: { type: "string", default: "hard_cut" },
              events: { type: "array" },
              send_moment: { type: "boolean", default: false },
            },
            required: ["id", "type", "start_frame", "end_frame", "narration", "intent", "renderer", "layout"],
          },
        },
        edit_list: { type: "object" },
      },
      required: ["core_idea", "scenes"],
    },
  },
  async execute(args: any, context: ToolContext): Promise<ToolResponseEnvelope> {
    try {
      const fps = args.fps || 30;
      const scenes = args.scenes || [];
      const totalFrames = scenes.length > 0 ? scenes[scenes.length - 1].end_frame : 0;

      const rawIR = {
        core_idea: args.core_idea,
        total_frames: totalFrames,
        fps,
        scenes,
        edit_list: args.edit_list || {},
      };

      const parsedIR = SceneIRSchema.parse(rawIR);

      context.stateManager.update({
        phase: "planned",
        scene_ir: parsedIR,
      });

      return {
        success: true,
        phase: "planned",
        status: "ready",
        next_step: "reel_lint_scene_ir",
        blocked_by: [],
        data: {
          core_idea: parsedIR.core_idea,
          scene_count: parsedIR.scenes.length,
          total_frames: parsedIR.total_frames,
          total_seconds: parsedIR.total_frames / fps,
          scenes: parsedIR.scenes.map((s) => ({
            id: s.id,
            type: s.type,
            frames: s.end_frame - s.start_frame,
            renderer: s.renderer,
            intent: s.intent,
          })),
        },
      };
    } catch (err: any) {
      return {
        success: false,
        phase: "planned",
        status: "blocked",
        next_step: "reel_plan_scenes",
        blocked_by: [err?.message || "Invalid Scene IR structure"],
        error: err?.message,
      };
    }
  },
};
