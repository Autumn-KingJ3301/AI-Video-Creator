import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EditListApplier } from "../../packages/core/src/composer/edit-list-applier.js";
import { SceneItem } from "../../packages/core/src/contracts/scene-ir.schema.js";

const ffmpegBin = ffmpegInstaller.path;

describe("EditListApplier Unit Tests", () => {
  const testDir = join(process.cwd(), ".test_edit_list_run");
  const applier = new EditListApplier();

  const scenes: SceneItem[] = [
    {
      id: "s01",
      type: "hook",
      start_frame: 0,
      end_frame: 60,
      narration: "Scene 1",
      intent: "Hook",
      renderer: "remotion",
      layout: "headline",
      transition_in: "hard_cut",
      events: [],
      assets: [],
      send_moment: false,
    },
    {
      id: "s02",
      type: "beat",
      start_frame: 60,
      end_frame: 120,
      narration: "Scene 2",
      intent: "Beat",
      renderer: "remotion",
      layout: "card",
      transition_in: "hard_cut",
      events: [],
      assets: [],
      send_moment: false,
    },
    {
      id: "s03",
      type: "proof",
      start_frame: 120,
      end_frame: 180,
      narration: "Scene 3",
      intent: "Proof",
      renderer: "remotion",
      layout: "step_list",
      transition_in: "hard_cut",
      events: [],
      assets: [],
      send_moment: false,
    },
    {
      id: "s04",
      type: "payoff",
      start_frame: 180,
      end_frame: 240,
      narration: "Scene 4",
      intent: "Payoff",
      renderer: "remotion",
      layout: "cta",
      transition_in: "hard_cut",
      events: [],
      assets: [],
      send_moment: false,
    },
  ];

  const renderedClips: Record<string, string> = {};

  beforeEach(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });

    // Generate 4 dummy 2-second clips (60 frames at 30fps)
    for (const sc of scenes) {
      const p = join(testDir, `${sc.id}.mp4`);
      spawnSync(ffmpegBin, [
        "-y",
        "-f", "lavfi",
        "-i", "color=c=black:s=100x100:d=2:r=30",
        "-c:v", "libx264",
        p,
      ]);
      renderedClips[sc.id] = p;
    }
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should apply non-destructive reordering and disabled scenes without modifying source clips", () => {
    const editList = {
      scene_order: ["s03", "s01", "s02"],
      disabled_scenes: ["s04"],
      muted_scenes: ["s02"],
      scene_trims: {},
    };

    const res = applier.apply(scenes, renderedClips, editList, 30, join(testDir, "edits"));

    expect(res.clips.length).toBe(3);
    expect(res.clips[0].sceneId).toBe("s03");
    expect(res.clips[1].sceneId).toBe("s01");
    expect(res.clips[2].sceneId).toBe("s02");
    expect(res.clips[2].isMuted).toBe(true);
    expect(res.totalFrames).toBe(180);
    expect(res.totalDurationSeconds).toBe(6.0);
  });

  it("should apply in/out trimming to create trimmed subclips with exact frame counts", () => {
    const editList = {
      scene_trims: {
        s01: { trim_in_frames: 10, trim_out_frames: 15 }, // 60 - 25 = 35 frames
      },
      disabled_scenes: ["s02", "s03", "s04"],
    };

    const res = applier.apply(scenes, renderedClips, editList, 30, join(testDir, "edits"));

    expect(res.clips.length).toBe(1);
    expect(res.clips[0].sceneId).toBe("s01");
    expect(res.clips[0].durationFrames).toBe(35);
    expect(res.clips[0].durationSeconds).toBeCloseTo(35 / 30, 2);
    expect(existsSync(res.clips[0].clipPath)).toBe(true);
    expect(res.totalFrames).toBe(35);
  });
});
