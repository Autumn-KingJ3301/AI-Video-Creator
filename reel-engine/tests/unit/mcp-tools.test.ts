import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SceneCache } from "../../packages/core/src/cache/scene-cache.js";
import { StateManager } from "../../packages/core/src/state/state-manager.js";
import { ToolRegistry } from "../../packages/mcp-server/src/tools/registry.js";
import { ToolContext } from "../../packages/mcp-server/src/tools/tool.interface.js";

describe("MCP Tools Unit Tests", () => {
  const testDir = join(process.cwd(), ".test_mcp_tools_run");
  let context: ToolContext;
  let registry: ToolRegistry;

  beforeEach(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });
    context = {
      workDir: testDir,
      stateManager: new StateManager(join(testDir, ".state", "project-state.json")),
      cache: new SceneCache(join(testDir, ".cache")),
    };
    registry = new ToolRegistry();
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("reel_init_project should initialize brief, Corsela theme tokens, and advance to input phase", async () => {
    const res = await registry.execute("reel_init_project", {
      brief: "How to audit AI code in 3 steps",
      project_id: "test_proj_01",
    }, context);

    expect(res.success).toBe(true);
    expect(res.phase).toBe("input");
    expect(res.next_step).toBe("reel_transcribe_audio");
    expect(res.data.project_id).toBe("test_proj_01");
    expect(res.data.config.style.preset).toBe("corsela_editorial");
  });

  it("reel_plan_scenes should validate contiguous boundaries and reject gaps", async () => {
    // Valid scenes
    const resValid = await registry.execute("reel_plan_scenes", {
      core_idea: "AI code audit workflow",
      scenes: [
        {
          id: "s01",
          type: "hook",
          start_frame: 0,
          end_frame: 60,
          narration: "Hook",
          intent: "Intent",
          renderer: "remotion",
          layout: "headline",
        },
        {
          id: "s02",
          type: "beat",
          start_frame: 60,
          end_frame: 120,
          narration: "Beat",
          intent: "Intent",
          renderer: "remotion",
          layout: "card",
        },
      ],
    }, context);

    expect(resValid.success).toBe(true);
    expect(resValid.phase).toBe("planned");
    expect(resValid.next_step).toBe("reel_lint_scene_ir");

    // Invalid scenes with boundary gap
    const resGap = await registry.execute("reel_plan_scenes", {
      core_idea: "AI code audit workflow",
      scenes: [
        {
          id: "s01",
          type: "hook",
          start_frame: 0,
          end_frame: 60,
          narration: "Hook",
          intent: "Intent",
          renderer: "remotion",
          layout: "headline",
        },
        {
          id: "s02",
          type: "beat",
          start_frame: 70, // Gap between 60 and 70!
          end_frame: 120,
          narration: "Beat",
          intent: "Intent",
          renderer: "remotion",
          layout: "card",
        },
      ],
    }, context);

    expect(resGap.success).toBe(false);
    expect(resGap.status).toBe("blocked");
    expect(resGap.blocked_by.length).toBeGreaterThan(0);
  });

  it("reel_author_scene should enforce security restrictions on Python Manim code", async () => {
    // Unsafe Manim code attempting os import
    const resUnsafe = await registry.execute("reel_author_scene", {
      scene_id: "s01",
      renderer: "manim",
      code: "import os\nprint(os.listdir('.'))",
    }, context);

    expect(resUnsafe.success).toBe(false);
    expect(resUnsafe.status).toBe("blocked");
    expect(resUnsafe.error).toBe("Security sandbox violation");

    // Safe Manim code
    const resSafe = await registry.execute("reel_author_scene", {
      scene_id: "s01",
      renderer: "manim",
      code: "from manim_worker.helpers import ReelScene\nclass Scene_s01(ReelScene):\n    pass",
    }, context);

    expect(resSafe.success).toBe(true);
    expect(resSafe.data.file_path).toContain("s01.py");
  });

  it("reel_get_state should return state details and appropriate dynamic next_step", async () => {
    await registry.execute("reel_init_project", { brief: "Test brief" }, context);

    const res = await registry.execute("reel_get_state", {}, context);
    expect(res.success).toBe(true);
    expect(res.data.phase).toBe("input");
    expect(res.next_step).toBe("reel_transcribe_audio");
  });
});
