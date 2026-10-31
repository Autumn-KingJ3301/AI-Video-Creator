import { describe, it, expect } from "vitest";
import { TimingSolver } from "../../packages/core/src/timing/timing-solver.js";
import { PhraseSegment, SceneBlueprint } from "../../packages/core/src/timing/contracts.js";
import { ProjectConfigSchema } from "../../packages/core/src/contracts/project-config.schema.js";
import { SceneIRSchema } from "../../packages/core/src/contracts/scene-ir.schema.js";

describe("TimingSolver Unit Tests", () => {
  const solver = new TimingSolver();
  const config30fps = ProjectConfigSchema.parse({
    format: { fps: 30 },
    pacing: { max_static_s: 2.0 },
    audio: { lead_frames: 3 },
  });

  const config24fps = ProjectConfigSchema.parse({
    format: { fps: 24 },
    pacing: { max_static_s: 2.0 },
    audio: { lead_frames: 2 },
  });

  const mockPhrases: PhraseSegment[] = [
    {
      id: "p01",
      text: "AI generated code?",
      words: [],
      start_s: 0.2,
      end_s: 1.8,
      start_frame: 6,
      end_frame: 54,
      keyword: "generated",
    },
    {
      id: "p02",
      text: "Get a code audit now.",
      words: [],
      start_s: 2.1,
      end_s: 4.2,
      start_frame: 63,
      end_frame: 126,
      keyword: "audit",
    },
    {
      id: "p03",
      text: "Understand every risk clearly.",
      words: [],
      start_s: 4.5,
      end_s: 7.0,
      start_frame: 135,
      end_frame: 210,
      keyword: "clearly",
    },
    {
      id: "p04",
      text: "And launch with total confidence.",
      words: [],
      start_s: 7.3,
      end_s: 9.8,
      start_frame: 219,
      end_frame: 294,
      keyword: "confidence",
    },
  ];

  const mockBlueprints: SceneBlueprint[] = [
    {
      id: "s01",
      type: "hook",
      narration: "AI generated code?",
      intent: "Hook viewers with question",
      renderer: "remotion",
      layout: "editorial_hero",
    },
    {
      id: "s02",
      type: "beat",
      narration: "Get a code audit now.",
      intent: "Show numbered list",
      renderer: "remotion",
      layout: "step_list_card",
    },
    {
      id: "s03",
      type: "proof",
      narration: "Understand every risk clearly.",
      intent: "Show complexity graph",
      renderer: "manim",
      layout: "vertical_math_graph",
    },
    {
      id: "s04",
      type: "payoff",
      narration: "And launch with total confidence.",
      intent: "Payoff card with button",
      renderer: "remotion",
      layout: "editorial_payoff_cta",
    },
  ];

  it("should solve exact 30fps timeline with zero frame drift and contiguous boundaries", () => {
    const audioDuration = 10.0; // 300 frames @ 30fps
    const result = solver.solve({
      audioDurationSeconds: audioDuration,
      phrases: mockPhrases,
      sceneBlueprints: mockBlueprints,
      config: config30fps,
    });

    expect(result.totalFrames).toBe(300);
    expect(result.driftFrames).toBe(0);
    expect(result.scenes.length).toBe(4);

    // Verify contiguous boundaries: scenes[i].end_frame === scenes[i+1].start_frame
    for (let i = 0; i < result.scenes.length - 1; i++) {
      expect(result.scenes[i].end_frame).toBe(result.scenes[i + 1].start_frame);
    }
    expect(result.scenes[0].start_frame).toBe(0);
    expect(result.scenes[3].end_frame).toBe(300);

    // Verify SceneIRSchema accepts the generated output
    const sceneIR = {
      $schema: "https://reel-engine.dev/schemas/v0.1/scene-ir.json",
      core_idea: "AI generated code needs independent review before release.",
      total_frames: result.totalFrames,
      fps: result.fps,
      scenes: result.scenes,
      edit_list: result.editList,
    };
    expect(() => SceneIRSchema.parse(sceneIR)).not.toThrow();
  });

  it("should solve exact 24fps timeline with zero frame drift", () => {
    const audioDuration = 10.0; // 240 frames @ 24fps
    const result = solver.solve({
      audioDurationSeconds: audioDuration,
      phrases: mockPhrases,
      sceneBlueprints: mockBlueprints,
      config: config24fps,
    });

    expect(result.totalFrames).toBe(240);
    expect(result.driftFrames).toBe(0);
    expect(result.scenes[0].start_frame).toBe(0);
    expect(result.scenes[3].end_frame).toBe(240);

    for (let i = 0; i < result.scenes.length - 1; i++) {
      expect(result.scenes[i].end_frame).toBe(result.scenes[i + 1].start_frame);
    }
  });

  it("should enforce pacing visual change budget (no static interval > max_static_s)", () => {
    const audioDuration = 15.0; // Long scenes
    const result = solver.solve({
      audioDurationSeconds: audioDuration,
      phrases: mockPhrases,
      sceneBlueprints: mockBlueprints,
      config: config30fps,
    });

    // Every scene must have visual events spaced <= max_static_s (2.0s = 60 frames)
    for (const sc of result.scenes) {
      expect(sc.events.length).toBeGreaterThanOrEqual(1);
      expect(sc.events[0].frame).toBe(sc.start_frame);
    }
    expect(result.staticIntervalsMaxSeconds).toBeLessThanOrEqual(2.05);
  });
});
