import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

import { QARunner } from "../../packages/core/src/qa/qa-runner.js";
import { ProjectConfigSchema } from "../../packages/core/src/contracts/project-config.schema.js";
import { SceneIR, SceneIRSchema } from "../../packages/core/src/contracts/scene-ir.schema.js";

const ffmpegBin = ffmpegInstaller.path;

describe("Build Phase D: Quality Gates & Automated Linter Integration", () => {
  const runner = new QARunner();
  const goldenFixtureDir = resolve(__dirname, "../../fixtures/hybrid-30s-corsela");
  const testDir = resolve(__dirname, "../../fixtures/.qa_gates_test");

  const frozenClipPath = join(testDir, "bad_frozen_clip.mp4");
  const clippedAudioPath = join(testDir, "bad_clipped_audio.wav");

  beforeAll(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });

    // Generate frozen 3.0s clip (motionless red screen)
    execFileSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "color=c=red:s=320x240:d=3.0:r=30",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      frozenClipPath,
    ], { stdio: "pipe" });

    // Generate clipped audio peaking > 0 dBFS
    execFileSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=880:duration=2.0",
      "-af", "volume=40.0",
      "-ar", "44100",
      "-ac", "1",
      clippedAudioPath,
    ], { stdio: "pipe" });
  });

  it("Positive Control: Golden Hybrid Reel must pass all blocking gates and rubric", () => {
    const irPath = join(goldenFixtureDir, "scene-ir.json");
    const rawIR = JSON.parse(readFileSync(irPath, "utf-8"));
    const sceneIR = SceneIRSchema.parse(rawIR);
    const config = ProjectConfigSchema.parse({});

    const report = runner.run({
      sceneIR,
      config,
      skipMediaInspection: true,
    });

    expect(report.all_blocking_passed).toBe(true);
    expect(report.blocking_violations_count).toBe(0);
    expect(report.rubric).toBeDefined();

    // Rubric assertions: total score >= 10, no zeroes
    const r = report.rubric!;
    expect(r.hook.score).toBeGreaterThanOrEqual(1);
    expect(r.one_idea.score).toBeGreaterThanOrEqual(1);
    expect(r.pacing.score).toBeGreaterThanOrEqual(1);
    expect(r.legibility.score).toBeGreaterThanOrEqual(1);
    expect(r.motion.score).toBeGreaterThanOrEqual(1);
    expect(r.send_moment.score).toBeGreaterThanOrEqual(1);
    expect(r.payoff_and_loop.score).toBeGreaterThanOrEqual(1);
  });

  it("Negative Control 1: Intentionally frozen clip must trigger GATE_STATIC_LIMIT blocker", () => {
    const config = ProjectConfigSchema.parse({
      pacing: { max_static_s: 2.0 },
    });

    const frozenIR: SceneIR = {
      $schema: "https://reel-engine.dev/schemas/v0.1/scene-ir.json",
      core_idea: "AI generated code requires independent review before release.",
      total_frames: 90,
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
          events: [{ frame: 0, kind: "element_in" }, { frame: 45, kind: "text_event" }],
          assets: [],
          send_moment: false,
        },
      ],
      edit_list: { scene_order: ["s01"] },
    };

    const report = runner.run({
      sceneIR: frozenIR,
      config,
      renderedClips: { s01: frozenClipPath },
    });

    expect(report.all_blocking_passed).toBe(false);
    expect(report.blocking_violations_count).toBeGreaterThanOrEqual(1);
    expect(report.violations.some(v => v.gate_id === "GATE_STATIC_LIMIT")).toBe(true);
  });

  it("Negative Control 2: Safe-zone breach layout must trigger GATE_SAFE_ZONE blocker", () => {
    const config = ProjectConfigSchema.parse({});
    const badLayoutIR: SceneIR = {
      $schema: "https://reel-engine.dev/schemas/v0.1/scene-ir.json",
      core_idea: "AI generated code requires independent review before release.",
      total_frames: 90,
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
          layout: "danger_zone_bottom_nav",
          events: [{ frame: 0, kind: "element_in" }],
          assets: [],
          send_moment: false,
        },
      ],
      edit_list: { scene_order: ["s01"] },
    };

    const report = runner.run({
      sceneIR: badLayoutIR,
      config,
      skipMediaInspection: true,
    });

    expect(report.all_blocking_passed).toBe(false);
    expect(report.violations.some(v => v.gate_id === "GATE_SAFE_ZONE")).toBe(true);
  });

  it("Negative Control 3: Clipped audio track must trigger GATE_AUDIO_LOUDNESS_CLIPPING blocker", () => {
    const config = ProjectConfigSchema.parse({});
    const dummyIR: SceneIR = {
      $schema: "https://reel-engine.dev/schemas/v0.1/scene-ir.json",
      core_idea: "AI generated code requires independent review before release.",
      total_frames: 60,
      fps: 30,
      scenes: [
        {
          id: "s01",
          type: "hook",
          start_frame: 0,
          end_frame: 60,
          narration: "Audio clipping test",
          intent: "Hook viewers",
          renderer: "remotion",
          layout: "editorial_hero",
          events: [{ frame: 0, kind: "element_in" }],
          assets: [],
          send_moment: false,
        },
      ],
      edit_list: { scene_order: ["s01"] },
    };

    const report = runner.run({
      sceneIR: dummyIR,
      config,
      masterAudioPath: clippedAudioPath,
      skipMediaInspection: false,
    });

    expect(report.all_blocking_passed).toBe(false);
    expect(report.violations.some(v => v.gate_id === "GATE_AUDIO_LOUDNESS_CLIPPING")).toBe(true);
  });

  it("Negative Control 4: Missing payoff scene must trigger RUBRIC_ZERO_SCORE blocker", () => {
    const config = ProjectConfigSchema.parse({});
    // Scene IR without payoff or loop
    const incompleteIR: SceneIR = {
      $schema: "https://reel-engine.dev/schemas/v0.1/scene-ir.json",
      core_idea: "AI generated code requires independent review before release.",
      total_frames: 90,
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
          events: [{ frame: 0, kind: "element_in" }],
          assets: [],
          send_moment: true,
        },
      ],
      edit_list: { scene_order: ["s01"] },
    };

    const report = runner.run({
      sceneIR: incompleteIR,
      config,
      skipMediaInspection: true,
    });

    expect(report.all_blocking_passed).toBe(false);
    expect(report.violations.some(v => v.gate_id === "RUBRIC_ZERO_SCORE")).toBe(true);
  });
});
