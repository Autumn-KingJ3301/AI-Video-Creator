import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { probeVideo } from "../../packages/core/src/engine/vertical-slice.js";
import { InMemoryTransport } from "../../packages/mcp-server/src/protocol/transport.js";
import { MCPServer } from "../../packages/mcp-server/src/server.js";

const ffmpegBin = ffmpegInstaller.path;

describe("Build Phase F: MCP Server Autonomous Agent Integration Session", () => {
  const testDir = join(process.cwd(), ".test_mcp_agent_session");
  let transport: InMemoryTransport;
  let server: MCPServer;
  let msgId = 1;

  const send = async (method: string, params: any) => {
    const id = msgId++;
    const res = await transport.simulateClientMessage({
      jsonrpc: "2.0",
      id,
      method,
      params,
    });
    expect(res).toBeDefined();
    expect(res?.id).toBe(id);
    return res;
  };

  const callTool = async (name: string, args: any) => {
    const res = await send("tools/call", { name, arguments: args });
    expect(res?.result?.content).toBeDefined();
    const rawText = res?.result?.content[0]?.text;
    expect(rawText).toBeDefined();
    return JSON.parse(rawText);
  };

  const masterAudioPath = join(testDir, "agent_speech.wav");
  const musicPath = join(testDir, "agent_bgm.wav");

  beforeAll(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });

    // Generate 6-second narration audio normalized to -14 LUFS
    spawnSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=440:duration=6",
      "-af", "loudnorm=I=-14:LRA=7:TP=-1.5",
      "-ar", "44100",
      masterAudioPath,
    ]);

    // Generate 6-second background music
    spawnSync(ffmpegBin, [
      "-y",
      "-f", "lavfi",
      "-i", "sine=frequency=220:duration=6",
      "-af", "volume=0.3",
      "-ar", "44100",
      musicPath,
    ]);

    transport = new InMemoryTransport();
    server = new MCPServer({
      workDir: testDir,
      transport,
    });
  });

  afterAll(() => {
    server.close();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("Step 1: Agent performs MCP initialize handshake", async () => {
    const res = await send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "autonomous-coding-agent", version: "1.0.0" },
    });

    expect(res?.result.protocolVersion).toBe("2024-11-05");
    expect(res?.result.serverInfo.name).toBe("reel-engine-mcp");
  });

  it("Step 2: Agent initializes project via reel_init_project", async () => {
    const env = await callTool("reel_init_project", {
      project_id: "agent_audit_reel",
      brief: "Audit your AI code in three quick steps",
      preset: "corsela_editorial",
    });

    expect(env.success).toBe(true);
    expect(env.phase).toBe("input");
    expect(env.status).toBe("ready");
    expect(env.next_step).toBe("reel_transcribe_audio");
  });

  it("Step 3: Agent ingests audio via reel_transcribe_audio", async () => {
    const env = await callTool("reel_transcribe_audio", {
      audio_path: masterAudioPath,
      script_text: "AI generated code? Get a code audit.",
    });

    expect(env.success).toBe(true);
    expect(env.phase).toBe("transcribed");
    expect(env.next_step).toBe("reel_plan_scenes");
    expect(env.data.duration_seconds).toBeCloseTo(6.0, 1);
  });

  it("Step 4: Agent submits Scene IR via reel_plan_scenes", async () => {
    // 3 scenes total 180 frames = 6 seconds
    const env = await callTool("reel_plan_scenes", {
      core_idea: "Fast AI code audit workflow",
      scenes: [
        {
          id: "s01",
          type: "hook",
          start_frame: 0,
          end_frame: 60,
          narration: "AI generated code? Get a code audit.",
          intent: "Hook attention immediately",
          renderer: "remotion",
          layout: "headline",
          transition_in: "hard_cut",
          events: [{ frame: 0, kind: "element_in" }, { frame: 30, kind: "text_event" }],
        },
        {
          id: "s02",
          type: "beat",
          start_frame: 60,
          end_frame: 120,
          narration: "Three steps to security and confidence.",
          intent: "Core proposition",
          renderer: "remotion",
          layout: "step_list",
          transition_in: "zoom_punch",
          events: [{ frame: 60, kind: "element_in" }, { frame: 90, kind: "motion_change" }],
        },
        {
          id: "s03",
          type: "payoff",
          start_frame: 120,
          end_frame: 180,
          narration: "Ship your app with zero doubt.",
          intent: "Call to action payoff",
          renderer: "manim",
          layout: "cta",
          transition_in: "hard_cut",
          events: [{ frame: 120, kind: "element_in" }, { frame: 150, kind: "text_event" }],
          send_moment: true,
        },
      ],
    });

    expect(env.success).toBe(true);
    expect(env.phase).toBe("planned");
    expect(env.next_step).toBe("reel_lint_scene_ir");
    expect(env.data.scene_count).toBe(3);
  });

  it("Step 5: Agent verifies Scene IR via reel_lint_scene_ir", async () => {
    const env = await callTool("reel_lint_scene_ir", {});

    expect(env.success).toBe(true);
    expect(env.status).toBe("ready");
    expect(env.next_step).toBe("reel_author_scene");
    expect(env.data.blocker_count).toBe(0);
  });

  it("Step 6: Agent authors scenes via reel_author_scene", async () => {
    // Author Scene 1 (Remotion)
    const env1 = await callTool("reel_author_scene", {
      scene_id: "s01",
      renderer: "remotion",
      code: "export const Scene_s01 = () => <div>Hook</div>;",
    });
    expect(env1.success).toBe(true);

    // Author Scene 2 (Remotion)
    const env2 = await callTool("reel_author_scene", {
      scene_id: "s02",
      renderer: "remotion",
      code: "export const Scene_s02 = () => <div>Beat</div>;",
    });
    expect(env2.success).toBe(true);

    // Author Scene 3 (Manim)
    const env3 = await callTool("reel_author_scene", {
      scene_id: "s03",
      renderer: "manim",
      code: "from manim_worker.helpers import ReelScene\nclass Scene_s03(ReelScene):\n    pass\n",
    });
    expect(env3.success).toBe(true);
    expect(env3.next_step).toBe("reel_render_scene");
  });

  it("Step 7: Agent renders scenes with caching via reel_render_scene", async () => {
    const env = await callTool("reel_render_scene", {});

    expect(env.success).toBe(true);
    expect(env.phase).toBe("rendered");
    expect(env.next_step).toBe("reel_verify_quality");
    expect(env.data.rendered_count).toBe(3);
  });

  it("Step 8: Agent verifies quality via reel_verify_quality", async () => {
    const env = await callTool("reel_verify_quality", {});

    expect(env.success).toBe(true);
    expect(env.phase).toBe("verified");
    expect(env.next_step).toBe("reel_compose_video");
    expect(env.data.report.all_blocking_passed).toBe(true);
  });

  it("Step 9: Agent applies non-destructive edits via reel_apply_edits", async () => {
    const env = await callTool("reel_apply_edits", {
      edit_list: {
        scene_order: ["s01", "s02", "s03"],
        scene_trims: {
          s01: { trim_in_frames: 0, trim_out_frames: 5 }, // 60 - 5 = 55 frames
        },
      },
    });

    expect(env.success).toBe(true);
    expect(env.next_step).toBe("reel_compose_video");
    // Total frames: 55 + 60 + 60 = 175 frames
    expect(env.data.total_frames).toBe(175);
  });

  it("Step 10: Agent composes final reel with captions and ducked audio via reel_compose_video", async () => {
    const env = await callTool("reel_compose_video", {
      music_path: musicPath,
      duck_music_db: -12,
      captions: [
        { start_frame: 0, end_frame: 45, text: "AI generated code?", keyword: "AI code" },
        { start_frame: 50, end_frame: 100, text: "Get a code audit.", keyword: "code audit" },
      ],
    });

    expect(env.success).toBe(true);
    expect(env.phase).toBe("exported");
    expect(env.status).toBe("completed");
    expect(env.next_step).toBe("done");
    expect(existsSync(env.data.output_path)).toBe(true);

    const probe = probeVideo(env.data.output_path);
    expect(probe.width).toBe(1080);
    expect(probe.height).toBe(1920);
    expect(probe.nbFrames).toBe(175);
    expect(probe.hasAudio).toBe(true);
  });

  it("Step 11: Agent queries reel_get_state for final confirmation", async () => {
    const env = await callTool("reel_get_state", {});

    expect(env.success).toBe(true);
    expect(env.phase).toBe("exported");
    expect(env.status).toBe("completed");
    expect(env.next_step).toBe("done");
    expect(env.data.scene_count).toBe(3);
    expect(env.data.output_video_path).toContain("agent_audit_reel_final.mp4");
  });
});
