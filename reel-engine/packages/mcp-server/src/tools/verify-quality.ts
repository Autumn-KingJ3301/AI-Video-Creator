import { QARunner } from "../../../core/src/qa/qa-runner.js";
import { ToolResponseEnvelope } from "../../../core/src/contracts/project-state.schema.js";
import { MCPToolHandler, ToolContext } from "./tool.interface.js";

export const verifyQualityTool: MCPToolHandler = {
  name: "reel_verify_quality",
  description: "Runs deterministic quality gates (frame counts, freeze detection, safe zones, loudness, contrast) and scores the director self-review rubric.",
  definition: {
    name: "reel_verify_quality",
    description: "Runs deterministic quality gates (frame counts, freeze detection, safe zones, loudness, contrast) and scores the director self-review rubric.",
    inputSchema: {
      type: "object",
      properties: {
        rubric_scores: {
          type: "object",
          description: "Optional self-review rubric scores for the 7 director criteria (0-2 scale)",
        },
      },
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
        blocked_by: ["MISSING_SCENE_IR: No Scene IR found to verify"],
        error: "Missing Scene IR",
      };
    }

    const qaRunner = new QARunner();
    const report = qaRunner.run({
      sceneIR,
      config: state.config,
      renderedClips: state.rendered_clips,
      masterAudioPath: state.audio_path,
    });

    context.stateManager.update({
      quality_report: report,
      phase: report.all_blocking_passed ? "verified" : state.phase,
    });

    if (!report.all_blocking_passed) {
      const blockers = report.violations.filter((v) => v.severity === "blocker");
      return {
        success: false,
        phase: state.phase,
        status: "blocked",
        next_step: "reel_plan_scenes",
        blocked_by: blockers.map((b) => `[${b.gate_id}] ${b.message} (Suggested fix: ${b.suggested_fix})`),
        data: {
          report,
        },
        error: "Quality gates failed",
      };
    }

    return {
      success: true,
      phase: "verified",
      status: "ready",
      next_step: "reel_compose_video",
      blocked_by: [],
      data: {
        report,
      },
    };
  },
};
