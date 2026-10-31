import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ProjectConfigSchema,
  SceneIRSchema,
  ProjectStateSchema,
  EnginePhaseEnum,
  SelfReviewRubricSchema,
} from "../../packages/core/src/contracts/index.js";

describe("Contracts & Schemas (Build Phase A)", () => {
  it("should validate default ProjectConfig with hardware acceleration enabled", () => {
    const config = ProjectConfigSchema.parse({});
    expect(config.format.width).toBe(1080);
    expect(config.format.height).toBe(1920);
    expect(config.format.fps).toBe(30);
    expect(config.format.safe_zone.top).toBe(0.14);
    expect(config.format.safe_zone.bottom).toBe(0.35);
    expect(config.format.safe_zone.side).toBe(0.06);
    expect(config.export.encoder).toBe("h264_nvenc");
    expect(config.export.hardware_acceleration).toBe(true);
    expect(config.audio.input_source).toBe("both");
    expect(config.audio.loudness_lufs).toBe(-14);
  });

  it("should validate all starter preset JSON files against ProjectConfigSchema", () => {
    const presets = ["quick-tip.json", "explainer.json", "concept-math.json"];
    for (const presetFile of presets) {
      const filePath = resolve(__dirname, "../../presets/starter", presetFile);
      const raw = JSON.parse(readFileSync(filePath, "utf-8"));
      const parsed = ProjectConfigSchema.parse(raw);
      expect(parsed.format.width).toBe(1080);
      expect(parsed.format.height).toBe(1920);
      expect(parsed.format.fps).toBe(30);
    }
  });

  it("should parse and validate a valid Scene IR matching Section 5.2", () => {
    const validIR = {
      core_idea: "Because the gradient points uphill, moving opposite minimizes loss.",
      total_frames: 450,
      fps: 30,
      scenes: [
        {
          id: "s01",
          type: "hook",
          start_frame: 0,
          end_frame: 90,
          narration: "Why do AI models optimize with gradient descent?",
          intent: "stop scroll with visual ball on a 3d loss bowl",
          renderer: "remotion",
          layout: "focal_center_label_top",
          transition_in: "hard_cut",
          events: [
            { frame: 0, kind: "element_in" },
            { frame: 30, kind: "text_event" },
          ],
          send_moment: false,
        },
        {
          id: "s02",
          type: "beat",
          start_frame: 90,
          end_frame: 240,
          narration: "Because the gradient points in the steepest uphill direction.",
          intent: "show gradient vector on surface",
          renderer: "manim",
          layout: "focal_center_label_top",
          transition_in: "zoom_punch",
          events: [
            { frame: 90, kind: "element_in" },
            { frame: 150, kind: "motion_change" },
          ],
          send_moment: true,
        },
        {
          id: "s03",
          type: "payoff",
          start_frame: 240,
          end_frame: 450,
          narration: "So taking steps in the opposite direction guarantees you reach the minimum.",
          intent: "ball rolls to bowl bottom",
          renderer: "remotion",
          layout: "focal_center_label_top",
          transition_in: "mask_reveal",
          events: [
            { frame: 240, kind: "element_in" },
            { frame: 360, kind: "text_event" },
          ],
          send_moment: false,
        },
      ],
    };

    const parsed = SceneIRSchema.parse(validIR);
    expect(parsed.scenes.length).toBe(3);
    expect(parsed.scenes[1].renderer).toBe("manim");
    expect(parsed.scenes[1].send_moment).toBe(true);
  });

  it("should reject Scene IR with non-contiguous scene boundaries (gap or overlap)", () => {
    const invalidGapIR = {
      core_idea: "Valid single sentence core idea.",
      total_frames: 300,
      fps: 30,
      scenes: [
        {
          id: "s01",
          type: "hook",
          start_frame: 0,
          end_frame: 90,
          narration: "Hook text",
          intent: "Hook intent",
          renderer: "remotion",
          layout: "focal_center",
        },
        {
          id: "s02",
          type: "beat",
          start_frame: 100, // GAP: 90 to 100 is missing!
          end_frame: 200,
          narration: "Beat text",
          intent: "Beat intent",
          renderer: "remotion",
          layout: "focal_center",
        },
      ],
    };

    expect(() => SceneIRSchema.parse(invalidGapIR)).toThrow();
  });

  it("should validate ProjectState and FSM phase enum", () => {
    const state = ProjectStateSchema.parse({
      project_id: "proj_test_001",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      phase: "planned",
    });
    expect(state.phase).toBe("planned");
    expect(EnginePhaseEnum.Values.verified).toBe("verified");
  });

  it("should validate SelfReviewRubric scores correctly", () => {
    const rubric = SelfReviewRubricSchema.parse({
      hook: { score: 2, notes: "Event in frame 1, promise clear by 2s" },
      one_idea: { score: 2, notes: "Single sentence summary holds" },
      pacing: { score: 2, notes: "Visual change every 1.5-2.0s" },
      legibility: { score: 2, notes: "All text inside 14%/35% safe zone" },
      motion: { score: 2, notes: "Snappy ease-out entrances" },
      send_moment: { score: 1, notes: "Scene 2 contains gradient reveal" },
      payoff_and_loop: { score: 2, notes: "Ends on answer, loop seamless" },
    });
    expect(rubric.hook.score).toBe(2);
  });
});
