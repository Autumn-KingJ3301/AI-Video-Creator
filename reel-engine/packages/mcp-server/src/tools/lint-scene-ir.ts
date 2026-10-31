import { IRLinter } from "../../../core/src/qa/ir-linter.js";
import { ToolResponseEnvelope } from "../../../core/src/contracts/project-state.schema.js";
import { MCPToolHandler, ToolContext } from "./tool.interface.js";

export const lintSceneIRTool: MCPToolHandler = {
  name: "reel_lint_scene_ir",
  description: "Runs pre-render deterministic quality linting on the Scene IR (hook deadline, visual pacing <= 2.5s, safe zones, reading speed, contrast).",
  definition: {
    name: "reel_lint_scene_ir",
    description: "Runs pre-render deterministic quality linting on the Scene IR (hook deadline, visual pacing <= 2.5s, safe zones, reading speed, contrast).",
    inputSchema: {
      type: "object",
      properties: {
        scene_ir: { type: "object", description: "Optional Scene IR override to test linting without committing" },
      },
    },
  },
  async execute(args: any, context: ToolContext): Promise<ToolResponseEnvelope> {
    const state = context.stateManager.getState();
    const sceneIR = args.scene_ir || state.scene_ir;

    if (!sceneIR) {
      return {
        success: false,
        phase: state.phase,
        status: "blocked",
        next_step: "reel_plan_scenes",
        blocked_by: ["MISSING_SCENE_IR: Submit a valid Scene IR via reel_plan_scenes first"],
        error: "Missing Scene IR",
      };
    }

    const linter = new IRLinter();
    const violations = linter.lint(sceneIR, state.config);
    const blockers = violations.filter((v) => v.severity === "blocker");
    const advisories = violations.filter((v) => v.severity === "advisory");

    const allPassed = blockers.length === 0;

    return {
      success: allPassed,
      phase: state.phase,
      status: allPassed ? "ready" : "blocked",
      next_step: allPassed ? "reel_author_scene" : "reel_plan_scenes",
      blocked_by: blockers.map((b) => `[${b.gate_id}] ${b.message} (Suggested fix: ${b.suggested_fix})`),
      data: {
        all_passed: allPassed,
        blocker_count: blockers.length,
        advisory_count: advisories.length,
        violations,
      },
    };
  },
};
