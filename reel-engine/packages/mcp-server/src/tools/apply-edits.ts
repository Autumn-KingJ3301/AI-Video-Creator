import { EditListApplier } from "../../../core/src/composer/edit-list-applier.js";
import { EditListSchema } from "../../../core/src/contracts/scene-ir.schema.js";
import { ToolResponseEnvelope } from "../../../core/src/contracts/project-state.schema.js";
import { MCPToolHandler, ToolContext } from "./tool.interface.js";
import { join } from "node:path";

export const applyEditsTool: MCPToolHandler = {
  name: "reel_apply_edits",
  description: "Non-destructively updates the Edit List (scene order, in/out trims, disables, muting) without re-rendering raw clips.",
  definition: {
    name: "reel_apply_edits",
    description: "Non-destructively updates the Edit List (scene order, in/out trims, disables, muting) without re-rendering raw clips.",
    inputSchema: {
      type: "object",
      properties: {
        edit_list: {
          type: "object",
          properties: {
            scene_order: { type: "array", items: { type: "string" } },
            scene_trims: { type: "object" },
            disabled_scenes: { type: "array", items: { type: "string" } },
            muted_scenes: { type: "array", items: { type: "string" } },
          },
        },
      },
      required: ["edit_list"],
    },
  },
  async execute(args: any, context: ToolContext): Promise<ToolResponseEnvelope> {
    const state = context.stateManager.getState();
    const sceneIR = state.scene_ir;

    if (!sceneIR) {
      return {
        success: false,
        phase: state.phase,
        status: "blocked",
        next_step: "reel_plan_scenes",
        blocked_by: ["MISSING_SCENE_IR: No Scene IR found"],
        error: "Missing Scene IR",
      };
    }

    try {
      const editList = EditListSchema.parse(args.edit_list);
      const applier = new EditListApplier();
      const editsDir = join(context.workDir, ".cache", "edits");

      const res = applier.apply(sceneIR.scenes, state.rendered_clips, editList, sceneIR.fps, editsDir);

      // Update stored scene_ir with the new edit_list
      const updatedIR = {
        ...sceneIR,
        edit_list: editList,
      };

      context.stateManager.update({
        scene_ir: updatedIR,
      });

      return {
        success: true,
        phase: state.phase,
        status: "ready",
        next_step: "reel_compose_video",
        blocked_by: [],
        data: {
          active_clips: res.clips.map((c) => ({
            scene_id: c.sceneId,
            duration_frames: c.durationFrames,
            is_muted: c.isMuted,
          })),
          total_frames: res.totalFrames,
          total_seconds: res.totalDurationSeconds,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        phase: state.phase,
        status: "blocked",
        next_step: "reel_apply_edits",
        blocked_by: [err?.message || "Invalid edit list parameters"],
        error: err?.message,
      };
    }
  },
};
