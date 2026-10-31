import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ProjectConfig, ProjectConfigSchema } from "../../packages/core/src/contracts/project-config.schema.js";
import { SceneIR, SceneIRSchema, SceneItem } from "../../packages/core/src/contracts/scene-ir.schema.js";
import { JobRunner } from "../../packages/core/src/engine/job-runner.js";
import { probeVideo } from "../../packages/core/src/engine/vertical-slice.js";

const ffmpegBin = ffmpegInstaller.path;

describe("Build Phase E: Composition, Caching & Recovery Integration Suite", () => {
  const testDir = join(process.cwd(), ".test_integration_phase_e");
  const clipsOutDir = join(testDir, "raw_clips");

  const projectConfig: ProjectConfig = ProjectConfigSchema.parse({
    format: { width: 1080, height: 1920, fps: 30 },
    audio: { loudness_lufs: -14.0, duck_music_db: -12 },
    pacing: { max_static_s: 2.5 },
  });

  // 4 contiguous scenes total 240 frames = 8 seconds
  const initialSceneIR: SceneIR = SceneIRSchema.parse({
    core_idea: "Fast AI code audit workflow",
    total_frames: 240,
    fps: 30,
    scenes: [
      {
        id: "s01",
        type: "hook",
        start_frame: 0,
        end_frame: 60,
        narration: "AI generated code? Get a code audit.",
        intent: "Hook attention",
        renderer: "remotion",
        layout: "headline",
        transition_in: "hard_cut",
        events: [{ frame: 0, kind: "element_in" }, { frame: 30, kind: "motion_change" }],
        assets: [],
        send_moment: false,
      },
      {
        id: "s02",
        type: "beat",
        start_frame: 60,
        end_frame: 120,
        narration: "Security and reliability review.",
        intent: "Core proposition",
        renderer: "remotion",
        layout: "card",
        transition_in: "zoom_punch",
        events: [{ frame: 60, kind: "element_in" }, { frame: 90, kind: "text_event" }],
        assets: [],
        send_moment: false,
      },
      {
        id: "s03",
        type: "proof",
        start_frame: 120,
        end_frame: 180,
        narration: "Three steps to launch confidently.",
        intent: "Actionable roadmap",
        renderer: "manim",
        layout: "step_list",
        transition_in: "hard_cut",
        events: [{ frame: 120, kind: "element_in" }, { frame: 150, kind: "motion_change" }],
        assets: [],
        send_moment: false,
      },
      {
        id: "s04",
        type: "payoff",
        start_frame: 180,
        end_frame: 240,
        narration: "Ship your app with zero doubts.",
        intent: "Call to action",
        renderer: "remotion",
        layout: "cta",
        transition_in: "hard_cut",
        events: [{ frame: 180, kind: "element_in" }, { frame: 210, kind: "text_event" }],
        assets: [],
        send_moment: true,
      },
    ],
    edit_list: {},
  });

  const masterAudioPath = join(testDir, "narration_master.wav");
  const musicPath = join(testDir, "bgm.wav");

  beforeAll(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });
    if (!existsSync(clipsOutDir)) mkdirSync(clipsOutDir, { recursive: true });

    // Generate 8s narration master audio normalized to -14 LUFS
    spawnSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=440:duration=8",
      "-af", "loudnorm=I=-14:LRA=7:TP=-1.5",
      "-ar", "44100",
      masterAudioPath,
    ]);

    // Generate 8s background music
    spawnSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=220:duration=8",
      "-af", "volume=0.4",
      "-ar", "44100",
      musicPath,
    ]);
  });

  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  // Mock renderer that generates valid 1080x1920 MP4 scene clips with movement
  const mockSceneRenderer = async (scene: SceneItem, workDir: string): Promise<string> => {
    const durationFrames = scene.end_frame - scene.start_frame;
    const durationSeconds = durationFrames / 30;
    const clipPath = join(clipsOutDir, `${scene.id}_${Date.now()}.mp4`);

    // Animated box ensuring motion
    const filter = [
      `color=c=0xF4F0EA:s=1080x1920:d=${durationSeconds}:r=30`,
      `drawbox=x=100+(t*50):y=800:w=400:h=60:color=0xC84B22:t=fill`,
      `drawtext=text='Scene ${scene.id}':fontsize=48:fontcolor=0x141413:x=(w-text_w)/2:y=500`,
      `format=yuv420p`,
    ].join(",");

    const args = [
      "-y",
      "-f", "lavfi",
      "-i", filter,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-r", "30",
      "-t", String(durationSeconds),
      clipPath,
    ];

    const res = spawnSync(ffmpegBin, args, { encoding: "utf-8" });
    if (res.status !== 0) {
      throw new Error(`Failed to render mock scene ${scene.id}: ${res.stderr}`);
    }

    return clipPath;
  };

  it("Step 1: Initial Run renders all 4 scenes and populates cache (0 hits, 4 renders)", async () => {
    const runner = new JobRunner(testDir);

    const result = await runner.run({
      workDir: testDir,
      projectConfig,
      sceneIR: initialSceneIR,
      masterAudioPath,
      musicPath,
      sceneRenderer: mockSceneRenderer,
      skipQA: false,
    });

    expect(result.phase).toBe("exported");
    expect(result.cachedCount).toBe(0);
    expect(result.renderedCount).toBe(4);
    expect(existsSync(result.outputVideoPath)).toBe(true);

    const probe = probeVideo(result.outputVideoPath);
    expect(probe.width).toBe(1080);
    expect(probe.height).toBe(1920);
    expect(probe.fps).toBe(30);
    expect(probe.nbFrames).toBe(240);
    expect(probe.duration).toBeCloseTo(8.0, 1);
    expect(probe.hasAudio).toBe(true);
  });

  it("Step 2: Second Run with Scene 2 modified re-uses 3 cached clips and renders ONLY Scene 2 (3 hits, 1 render)", async () => {
    const runner = new JobRunner(testDir);

    // Modify narration of Scene 2
    const modifiedScenes = initialSceneIR.scenes.map((s) => {
      if (s.id === "s02") {
        return {
          ...s,
          narration: "New updated security review text.",
          intent: "Updated intent",
        };
      }
      return s;
    });

    const modifiedIR: SceneIR = SceneIRSchema.parse({
      ...initialSceneIR,
      scenes: modifiedScenes,
    });

    const result = await runner.run({
      workDir: testDir,
      projectConfig,
      sceneIR: modifiedIR,
      masterAudioPath,
      musicPath,
      sceneRenderer: mockSceneRenderer,
      skipQA: false,
    });

    expect(result.phase).toBe("exported");
    // Scenes s01, s03, s04 were unchanged -> 3 cache hits!
    expect(result.cachedCount).toBe(3);
    // Scene s02 was modified -> 1 render!
    expect(result.renderedCount).toBe(1);
    expect(existsSync(result.outputVideoPath)).toBe(true);
  });

  it("Step 3: Non-destructive Edit List reorders and trims without re-rendering raw clips", async () => {
    const runner = new JobRunner(testDir);

    // Apply edit list: reorder [s03, s01, s02], disable s04, trim s01 by 15 frames
    const editedIR: SceneIR = SceneIRSchema.parse({
      ...initialSceneIR,
      edit_list: {
        scene_order: ["s03", "s01", "s02"],
        disabled_scenes: ["s04"],
        scene_trims: {
          s01: { trim_in_frames: 10, trim_out_frames: 5 }, // 60 - 15 = 45 frames
        },
      },
    });

    const result = await runner.run({
      workDir: testDir,
      projectConfig,
      sceneIR: editedIR,
      masterAudioPath,
      musicPath,
      sceneRenderer: mockSceneRenderer,
      skipQA: true, // skip QA since edit list intentionally trims total length
    });

    // All active scenes (s03, s01, s02) are already cached!
    expect(result.cachedCount).toBe(4);
    expect(result.renderedCount).toBe(0);

    const probe = probeVideo(result.outputVideoPath);
    // Expected frames: s03 (60) + s01 trimmed (45) + s02 (60) = 165 frames = 5.5s
    expect(probe.nbFrames).toBe(165);
    expect(probe.duration).toBeCloseTo(5.5, 1);
  });

  it("Step 4: Resilient Recovery recovers project state from disk", () => {
    const stateFile = join(testDir, ".state", "project-state.json");
    expect(existsSync(stateFile)).toBe(true);

    const raw = readFileSync(stateFile, "utf-8");
    const state = JSON.parse(raw);

    expect(state.phase).toBe("exported");
    expect(state.rendered_clips).toHaveProperty("s01");
    expect(state.rendered_clips).toHaveProperty("s02");
    expect(state.rendered_clips).toHaveProperty("s03");
    expect(state.rendered_clips).toHaveProperty("s04");
  });
});
