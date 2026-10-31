import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { EditList, SceneItem } from "../contracts/scene-ir.schema.js";

const ffmpegBin = ffmpegInstaller.path;

export interface ProcessedClip {
  sceneId: string;
  clipPath: string;
  durationFrames: number;
  durationSeconds: number;
  isMuted: boolean;
}

export interface EditListApplicationResult {
  clips: ProcessedClip[];
  totalFrames: number;
  totalDurationSeconds: number;
}

export class EditListApplier {
  /**
   * Applies non-destructive edit list rules (scene_order, disabled_scenes, muted_scenes, scene_trims)
   * to a set of rendered scene clips.
   */
  public apply(
    scenes: SceneItem[],
    renderedClips: Record<string, string>, // scene_id -> clipPath
    editList: Partial<EditList> = {},
    fps: number = 30,
    tempDir: string = ".cache/edits"
  ): EditListApplicationResult {
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    const disabledSet = new Set(editList.disabled_scenes || []);
    const mutedSet = new Set(editList.muted_scenes || []);
    const trims = editList.scene_trims || {};

    // 1. Determine active scene order
    let activeSceneIds: string[];
    if (editList.scene_order && editList.scene_order.length > 0) {
      activeSceneIds = editList.scene_order.filter((id) => !disabledSet.has(id));
    } else {
      activeSceneIds = scenes.map((s) => s.id).filter((id) => !disabledSet.has(id));
    }

    const sceneMap = new Map<string, SceneItem>();
    for (const s of scenes) {
      sceneMap.set(s.id, s);
    }

    const processedClips: ProcessedClip[] = [];
    let totalFrames = 0;

    for (let i = 0; i < activeSceneIds.length; i++) {
      const sceneId = activeSceneIds[i];
      const scene = sceneMap.get(sceneId);
      const originalClipPath = renderedClips[sceneId];

      if (!originalClipPath || !existsSync(originalClipPath)) {
        throw new Error(`Missing rendered clip for scene ${sceneId}: ${originalClipPath}`);
      }

      const originalFrames = scene ? scene.end_frame - scene.start_frame : 90;
      const trimInfo = trims[sceneId] || { trim_in_frames: 0, trim_out_frames: 0 };
      const trimIn = trimInfo.trim_in_frames || 0;
      const trimOut = trimInfo.trim_out_frames || 0;

      const trimmedFrames = originalFrames - trimIn - trimOut;
      if (trimmedFrames <= 0) {
        throw new Error(
          `Scene ${sceneId} trimmed duration (${trimmedFrames} frames) is non-positive. Original: ${originalFrames}, in: ${trimIn}, out: ${trimOut}`
        );
      }

      const trimmedDurationSeconds = trimmedFrames / fps;
      const isMuted = mutedSet.has(sceneId);

      // Check if trimming or muting is necessary
      const needsTrim = trimIn > 0 || trimOut > 0;

      let effectiveClipPath = originalClipPath;

      if (needsTrim) {
        const trimmedPath = join(tempDir, `${sceneId}_trimmed_${trimIn}_${trimOut}.mp4`);
        const startSec = trimIn / fps;

        const args = [
          "-y",
          "-ss", String(startSec),
          "-i", originalClipPath,
          "-t", String(trimmedDurationSeconds),
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-r", String(fps),
          trimmedPath,
        ];

        const res = spawnSync(ffmpegBin, args, { encoding: "utf-8" });
        if (res.status !== 0) {
          throw new Error(`Failed to apply trim to scene ${sceneId}: ${res.stderr}`);
        }
        effectiveClipPath = trimmedPath;
      }

      processedClips.push({
        sceneId,
        clipPath: effectiveClipPath,
        durationFrames: trimmedFrames,
        durationSeconds: trimmedDurationSeconds,
        isMuted,
      });

      totalFrames += trimmedFrames;
    }

    return {
      clips: processedClips,
      totalFrames,
      totalDurationSeconds: totalFrames / fps,
    };
  }
}
