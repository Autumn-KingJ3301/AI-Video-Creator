import { describe, it, expect } from "vitest";
import { RubricEvaluator } from "../../packages/core/src/qa/rubric-evaluator.js";
import { ProjectConfigSchema } from "../../packages/core/src/contracts/project-config.schema.js";
import { SceneIR } from "../../packages/core/src/contracts/scene-ir.schema.js";

describe("RubricEvaluator Unit Tests", () => {
  const evaluator = new RubricEvaluator();
  const config = ProjectConfigSchema.parse({
    format: { fps: 30 },
    pacing: { max_static_s: 2.5 },
  });

  const validIR: SceneIR = {
    $schema: "https://reel-engine.dev/schemas/v0.1/scene-ir.json",
    core_idea: "AI generated code requires independent review before release.",
    total_frames: 300,
    fps: 30,
    scenes: [
      {
        id: "s01",
        type: "hook",
        start_frame: 0,
        end_frame: 90,
        narration: "AI generated code?",
        intent: "Hook viewers",
        renderer: "remotion",
        layout: "editorial_hero",
        transition_in: "hard_cut",
        events: [{ frame: 0, kind: "element_in" }],
        assets: [],
        send_moment: false,
      },
      {
        id: "s02",
        type: "proof",
        start_frame: 90,
        end_frame: 210,
        narration: "Understand every code risk clearly.",
        intent: "Proof card",
        renderer: "remotion",
        layout: "step_list_card",
        transition_in: "hard_cut",
        events: [{ frame: 90, kind: "element_in" }, { frame: 150, kind: "motion_change" }],
        assets: [],
        send_moment: true,
      },
      {
        id: "s03",
        type: "payoff",
        start_frame: 210,
        end_frame: 300,
        narration: "Launch with confidence.",
        intent: "Payoff card",
        renderer: "remotion",
        layout: "editorial_payoff_cta",
        transition_in: "hard_cut",
        events: [{ frame: 210, kind: "element_in" }],
        assets: [],
        send_moment: false,
      },
    ],
    edit_list: {
      scene_order: ["s01", "s02", "s03"],
      muted_scenes: [],
      disabled_scenes: [],
    },
  };

  it("should score valid Scene IR with total score >= 10 and no zero scores", () => {
    const result = evaluator.evaluate(validIR, config);

    expect(result.totalScore).toBeGreaterThanOrEqual(10);
    expect(result.violations.length).toBe(0);

    const rubric = result.rubric;
    expect(rubric.hook.score).toBeGreaterThanOrEqual(1);
    expect(rubric.one_idea.score).toBeGreaterThanOrEqual(1);
    expect(rubric.pacing.score).toBeGreaterThanOrEqual(1);
    expect(rubric.legibility.score).toBeGreaterThanOrEqual(1);
    expect(rubric.motion.score).toBeGreaterThanOrEqual(1);
    expect(rubric.send_moment.score).toBeGreaterThanOrEqual(1);
    expect(rubric.payoff_and_loop.score).toBeGreaterThanOrEqual(1);
  });

  it("should block if any rubric item receives a zero score", () => {
    const badIR = JSON.parse(JSON.stringify(validIR));
    // Remove payoff scene completely so payoff_and_loop scores 0
    badIR.scenes = [badIR.scenes[0], badIR.scenes[1]];
    badIR.scenes[1].end_frame = 300;

    const result = evaluator.evaluate(badIR, config);
    expect(result.rubric.payoff_and_loop.score).toBe(0);
    expect(result.violations.some(v => v.gate_id === "RUBRIC_ZERO_SCORE")).toBe(true);
  });
});
