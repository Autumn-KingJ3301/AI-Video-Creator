import { describe, it, expect } from "vitest";
import { IRLinter } from "../../packages/core/src/qa/ir-linter.js";
import { ProjectConfigSchema } from "../../packages/core/src/contracts/project-config.schema.js";
import { SceneIR } from "../../packages/core/src/contracts/scene-ir.schema.js";

describe("IRLinter Unit Tests", () => {
  const linter = new IRLinter();
  const config = ProjectConfigSchema.parse({
    format: { fps: 30 },
    pacing: { hook_complete_s: 3.0, max_static_s: 2.5 },
    transitions: { max_heavy_per_10s: 1 },
    style: { palette: ["#F4F0EA", "#141413", "#C84B22", "#FFFFFF"] },
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
        events: [
          { frame: 0, kind: "element_in" },
          { frame: 45, kind: "text_event" },
        ],
        assets: [],
        send_moment: false,
      },
      {
        id: "s02",
        type: "beat",
        start_frame: 90,
        end_frame: 210,
        narration: "Get a code audit now.",
        intent: "Show value",
        renderer: "remotion",
        layout: "step_list_card",
        transition_in: "hard_cut",
        events: [
          { frame: 90, kind: "element_in" },
          { frame: 150, kind: "motion_change" },
        ],
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
        events: [
          { frame: 210, kind: "element_in" },
          { frame: 270, kind: "text_event" },
        ],
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

  it("should pass cleanly on valid Scene IR", () => {
    const violations = linter.lint(validIR, config);
    expect(violations.length).toBe(0);
  });

  it("should block if hook scene misses frame 0 entrance event", () => {
    const badIR = JSON.parse(JSON.stringify(validIR));
    badIR.scenes[0].events = [{ frame: 30, kind: "element_in" }]; // Starts late at frame 30

    const violations = linter.lint(badIR, config);
    expect(violations.some(v => v.gate_id === "GATE_HOOK_DEADLINE" && v.violation_type === "missing_frame_1_event")).toBe(true);
  });

  it("should block if hook scene exceeds hook_complete_s deadline", () => {
    const badIR = JSON.parse(JSON.stringify(validIR));
    badIR.scenes[0].end_frame = 120; // 4.0s (exceeds 3.0s limit)
    badIR.scenes[1].start_frame = 120;

    const violations = linter.lint(badIR, config);
    expect(violations.some(v => v.gate_id === "GATE_HOOK_DEADLINE" && v.violation_type === "hook_exceeds_deadline")).toBe(true);
  });

  it("should block if visual pacing gap exceeds max_static_s", () => {
    const badIR = JSON.parse(JSON.stringify(validIR));
    // Scene 2 runs from 90 to 210 (120 frames = 4.0s) with no events except at 90
    badIR.scenes[1].events = [{ frame: 90, kind: "element_in" }];

    const violations = linter.lint(badIR, config);
    expect(violations.some(v => v.gate_id === "GATE_VISUAL_PACING")).toBe(true);
  });

  it("should block if layout places elements in mobile danger zone", () => {
    const badIR = JSON.parse(JSON.stringify(validIR));
    badIR.scenes[1].layout = "danger_zone_banner";

    const violations = linter.lint(badIR, config);
    expect(violations.some(v => v.gate_id === "GATE_SAFE_ZONE")).toBe(true);
  });

  it("should block if reading speed is excessively rapid (> 22.5 cps)", () => {
    const badIR = JSON.parse(JSON.stringify(validIR));
    // 150 chars in 3.0s (50 chars/sec)
    badIR.scenes[0].narration = "This is an extremely excessively long narration string that cannot possibly be read by a human viewer in under three seconds on a mobile screen ever.";

    const violations = linter.lint(badIR, config);
    expect(violations.some(v => v.gate_id === "GATE_READING_SPEED")).toBe(true);
  });

  it("should block if transition budget is exceeded", () => {
    const badIR = JSON.parse(JSON.stringify(validIR));
    // 3 heavy transitions in a 10s reel (max allowed is 1)
    badIR.scenes[0].transition_in = "zoom_punch";
    badIR.scenes[1].transition_in = "swipe";
    badIR.scenes[2].transition_in = "mask_reveal";

    const violations = linter.lint(badIR, config);
    expect(violations.some(v => v.gate_id === "GATE_TRANSITION_BUDGET")).toBe(true);
  });
});
