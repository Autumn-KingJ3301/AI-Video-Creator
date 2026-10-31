import { ToolResponseEnvelope } from "../../../core/src/contracts/project-state.schema.js";
import { MCPToolHandler, ToolContext } from "./tool.interface.js";

export const getStateTool: MCPToolHandler = {
  name: "reel_get_state",
  description: "Queries current project state, active blockers, rendered clips, and recommended next action.",
  definition: {
    name: "reel_get_state",
    description: "Queries current project state, active blockers, rendered clips, and recommended next action.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  async execute(args: any, context: ToolContext): Promise<ToolResponseEnvelope> {
    const state = context.stateManager.getState();

    // Determine dynamic next step based on state
    let nextStep = "reel_init_project";
    let status: "ready" | "in_progress" | "completed" | "blocked" = "ready";

    switch (state.phase) {
      case "input":
        nextStep = state.audio_path ? "reel_plan_scenes" : "reel_transcribe_audio";
        break;
      case "transcribed":
        nextStep = "reel_plan_scenes";
        break;
      case "planned":
        nextStep = "reel_lint_scene_ir";
        break;
      case "authored":
        nextStep = "reel_render_scene";
        break;
      case "rendered":
        nextStep = "reel_verify_quality";
        break;
      case "verified":
        nextStep = "reel_compose_video";
        break;
      case "composed":
      case "exported":
        nextStep = "done";
        status = "completed";
        break;
    }

    const cacheStats = context.cache.getStats();

    return {
      success: true,
      phase: state.phase,
      status,
      next_step: nextStep,
      blocked_by: [],
      data: {
        project_id: state.project_id,
        phase: state.phase,
        brief: state.brief,
        scene_count: state.scene_ir?.scenes?.length || 0,
        rendered_clips_count: Object.keys(state.rendered_clips || {}).length,
        output_video_path: state.output_video_path,
        cache_stats: cacheStats,
        quality_report: state.quality_report ? {
          all_blocking_passed: state.quality_report.all_blocking_passed,
          blocking_violations: state.quality_report.blocking_violations_count,
        } : null,
      },
    };
  },
};
