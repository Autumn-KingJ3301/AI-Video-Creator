import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { SceneItem } from "../contracts/scene-ir.schema.js";

export interface SceneCacheKeyParams {
  scene: SceneItem;
  code?: string;
  themeTokens?: Record<string, any>;
  audioPath?: string;
  audioSliceHash?: string;
  extra?: Record<string, any>;
}

/**
 * Deterministically stringifies an object with sorted keys.
 */
function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") +
    "}"
  );
}

/**
 * Computes a deterministic SHA-256 hash identifying a scene's render state.
 * Any change to scene IR, code, theme tokens, or audio slice produces a distinct hash.
 */
export function computeSceneCacheKey(params: SceneCacheKeyParams): string {
  const hasher = createHash("sha256");

  // 1. Scene IR metadata (normalized and sorted)
  const normalizedScene = {
    id: params.scene.id,
    type: params.scene.type,
    start_frame: params.scene.start_frame,
    end_frame: params.scene.end_frame,
    narration: params.scene.narration,
    intent: params.scene.intent,
    renderer: params.scene.renderer,
    layout: params.scene.layout,
    transition_in: params.scene.transition_in,
    events: params.scene.events,
    assets: params.scene.assets,
    send_moment: params.scene.send_moment,
  };
  hasher.update("scene:" + stableStringify(normalizedScene));

  // 2. Scene source code
  if (params.code) {
    hasher.update("code:" + params.code);
  }

  // 3. Theme tokens
  if (params.themeTokens) {
    hasher.update("theme:" + stableStringify(params.themeTokens));
  }

  // 4. Audio slice hash or audio file content
  if (params.audioSliceHash) {
    hasher.update("audioHash:" + params.audioSliceHash);
  } else if (params.audioPath && existsSync(params.audioPath)) {
    try {
      const audioBuffer = readFileSync(params.audioPath);
      const audioHasher = createHash("sha256").update(audioBuffer).digest("hex");
      hasher.update("audioContent:" + audioHasher);
    } catch {
      hasher.update("audioPath:" + params.audioPath);
    }
  }

  // 5. Extra configuration parameters (dimensions, fps, renderer flags)
  if (params.extra) {
    hasher.update("extra:" + stableStringify(params.extra));
  }

  return hasher.digest("hex");
}
