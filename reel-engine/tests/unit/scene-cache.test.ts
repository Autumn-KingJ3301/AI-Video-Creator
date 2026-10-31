import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { computeSceneCacheKey } from "../../packages/core/src/cache/cache-key.js";
import { SceneCache } from "../../packages/core/src/cache/scene-cache.js";
import { SceneItem } from "../../packages/core/src/contracts/scene-ir.schema.js";

describe("SceneCache & CacheKey Unit Tests", () => {
  const testDir = join(process.cwd(), ".test_cache_run");
  const cacheDir = join(testDir, ".cache");

  const baseScene: SceneItem = {
    id: "s01",
    type: "hook",
    start_frame: 0,
    end_frame: 90,
    narration: "AI generated code? Get a code audit.",
    intent: "Stop scroll and promise payoff",
    renderer: "remotion",
    layout: "headline_split",
    transition_in: "hard_cut",
    events: [{ frame: 0, kind: "element_in" }],
    assets: [],
    send_moment: false,
  };

  beforeEach(() => {
    if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should compute deterministic hashes sensitive to scene IR, code, tokens, and audio", () => {
    const key1 = computeSceneCacheKey({
      scene: baseScene,
      code: "const x = 1;",
      themeTokens: { bg: "#F4F0EA" },
    });

    const key2 = computeSceneCacheKey({
      scene: baseScene,
      code: "const x = 1;",
      themeTokens: { bg: "#F4F0EA" },
    });

    expect(key1).toBe(key2);

    // Modify scene text
    const keyDiffText = computeSceneCacheKey({
      scene: { ...baseScene, narration: "Different narration" },
      code: "const x = 1;",
      themeTokens: { bg: "#F4F0EA" },
    });
    expect(keyDiffText).not.toBe(key1);

    // Modify code
    const keyDiffCode = computeSceneCacheKey({
      scene: baseScene,
      code: "const x = 2;",
      themeTokens: { bg: "#F4F0EA" },
    });
    expect(keyDiffCode).not.toBe(key1);

    // Modify theme tokens
    const keyDiffTokens = computeSceneCacheKey({
      scene: baseScene,
      code: "const x = 1;",
      themeTokens: { bg: "#000000" },
    });
    expect(keyDiffTokens).not.toBe(key1);
  });

  it("should store, retrieve, hit-count, and invalidate clips correctly", () => {
    const cache = new SceneCache(cacheDir);

    const dummyClip = join(testDir, "test_clip.mp4");
    writeFileSync(dummyClip, "dummy mp4 content", "utf-8");

    const hash = "abc123hash";
    expect(cache.has(hash)).toBe(false);
    expect(cache.get(hash)).toBeNull();

    // Store in cache
    const cachedPath = cache.put(hash, dummyClip, { sceneId: "s01" });
    expect(existsSync(cachedPath)).toBe(true);
    expect(cache.has(hash)).toBe(true);

    // Retrieve from cache (Hit)
    const retrievedPath = cache.get(hash);
    expect(retrievedPath).toBe(cachedPath);

    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);

    // Invalidate by sceneId
    cache.invalidate("s01");
    expect(cache.has(hash)).toBe(false);
    expect(cache.get(hash)).toBeNull();
  });
});
