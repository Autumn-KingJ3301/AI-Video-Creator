import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { GateViolation } from "../contracts/project-state.schema.js";
import { probeVideo } from "../engine/vertical-slice.js";
import { AudioAnalyzer } from "../timing/audio-analyzer.js";

const ffmpegBin = ffmpegInstaller.path;

export interface InspectClipInput {
  clipPath: string;
  sceneId: string;
  expectedFrames: number;
  fps: number;
  maxStaticSeconds?: number;
}

export class VideoInspector {
  private audioAnalyzer = new AudioAnalyzer();

  /**
   * Inspects a rendered scene clip against deterministic video quality gates.
   */
  inspectClip(input: InspectClipInput): GateViolation[] {
    const violations: GateViolation[] = [];
    const { clipPath, sceneId, expectedFrames, fps, maxStaticSeconds = 2.5 } = input;

    // 1. GATE_RENDER_COMPLETION
    if (!existsSync(clipPath)) {
      violations.push({
        gate_id: "GATE_RENDER_COMPLETION",
        scene_id: sceneId,
        severity: "blocker",
        violation_type: "clip_file_missing",
        message: `Rendered clip for scene "${sceneId}" was not found at ${clipPath}.`,
        suggested_fix: "Check renderer logs and re-render the scene.",
      });
      return violations;
    }

    const stat = statSync(clipPath);
    if (stat.size < 500) {
      violations.push({
        gate_id: "GATE_RENDER_COMPLETION",
        scene_id: sceneId,
        severity: "blocker",
        violation_type: "corrupted_zero_byte_clip",
        message: `Clip for scene "${sceneId}" is corrupted or empty (${stat.size} bytes).`,
        suggested_fix: "Re-render the scene to produce a valid MP4 container.",
      });
      return violations;
    }

    let probe;
    try {
      probe = probeVideo(clipPath);
    } catch (e: any) {
      violations.push({
        gate_id: "GATE_RENDER_COMPLETION",
        scene_id: sceneId,
        severity: "blocker",
        violation_type: "ffprobe_failed",
        message: `Failed to probe video stream for scene "${sceneId}": ${e.message}`,
        suggested_fix: "Verify video codec compatibility (H.264 / yuv420p).",
      });
      return violations;
    }

    // 2. GATE_DURATION_MATCH
    const frameDelta = Math.abs(probe.nbFrames - expectedFrames);
    if (frameDelta > 1) {
      violations.push({
        gate_id: "GATE_DURATION_MATCH",
        scene_id: sceneId,
        severity: "blocker",
        violation_type: "frame_count_mismatch",
        message: `Clip duration mismatch for scene "${sceneId}": rendered ${probe.nbFrames} frames, expected ${expectedFrames} frames (delta: ${frameDelta}).`,
        suggested_fix: `Render exact frame count matching Scene IR duration (${expectedFrames} frames).`,
      });
    }

    // 3. GATE_STATIC_LIMIT (Video Freezedetect)
    // Only check if clip is longer than maxStaticSeconds
    if (probe.duration > maxStaticSeconds) {
      const res = spawnSync(ffmpegBin, [
        "-i", clipPath,
        "-vf", `freezedetect=n=-60dB:d=${maxStaticSeconds}`,
        "-f", "null",
        "-",
      ], { encoding: "utf-8" });

      const stderr = res.stderr || "";
      if (stderr.includes("freeze_start")) {
        const freezeMatches = stderr.match(/freeze_duration:\s*([0-9.]+)/);
        const dur = freezeMatches ? freezeMatches[1] : `${maxStaticSeconds}+`;
        violations.push({
          gate_id: "GATE_STATIC_LIMIT",
          scene_id: sceneId,
          severity: "blocker",
          violation_type: "frozen_frames_detected",
          message: `Visual stillness detected in scene "${sceneId}": image holds completely static for ${dur}s, exceeding max limit of ${maxStaticSeconds}s.`,
          suggested_fix: "Add subtle motion, zoom, text entrance, or kinetic element to maintain viewer engagement.",
        });
      }
    }

    // 4. GATE_BLACK_OR_FROZEN (Blackdetect)
    const blackRes = spawnSync(ffmpegBin, [
      "-i", clipPath,
      "-vf", "blackdetect=d=0.5:pic_th=0.98",
      "-f", "null",
      "-",
    ], { encoding: "utf-8" });

    const blackStderr = blackRes.stderr || "";
    if (blackStderr.includes("black_start")) {
      violations.push({
        gate_id: "GATE_BLACK_OR_FROZEN",
        scene_id: sceneId,
        severity: "blocker",
        violation_type: "black_frames_detected",
        message: `Scene "${sceneId}" contains an all-black sequence exceeding 0.5s.`,
        suggested_fix: "Check scene background lighting and remove unintended black frames.",
      });
    }

    return violations;
  }

  /**
   * Inspects master audio against loudness and clipping quality gates.
   */
  inspectAudio(audioPath: string, targetLufs: number = -14): GateViolation[] {
    const violations: GateViolation[] = [];

    if (!existsSync(audioPath)) {
      violations.push({
        gate_id: "GATE_AUDIO_LOUDNESS_CLIPPING",
        severity: "blocker",
        violation_type: "audio_file_missing",
        message: `Master audio file not found at ${audioPath}.`,
        suggested_fix: "Generate or normalize audio track before compose.",
      });
      return violations;
    }

    const analysis = this.audioAnalyzer.analyze(audioPath);

    // Clipping check
    if (analysis.clipping_detected || analysis.true_peak_db > -0.5) {
      violations.push({
        gate_id: "GATE_AUDIO_LOUDNESS_CLIPPING",
        severity: "blocker",
        violation_type: "audio_clipping_detected",
        message: `Audio True Peak (${analysis.true_peak_db.toFixed(2)} dBFS) exceeds maximum safe ceiling of -0.5 dBFS.`,
        suggested_fix: "Apply limiter or reduce audio gain to prevent digital clipping distortion.",
      });
    }

    // Loudness check: tolerance within +/- 2.5 LUFS of target (-14 LUFS)
    const lufsDelta = Math.abs(analysis.integrated_lufs - targetLufs);
    if (lufsDelta > 2.5) {
      violations.push({
        gate_id: "GATE_AUDIO_LOUDNESS_CLIPPING",
        severity: lufsDelta > 4.0 ? "blocker" : "advisory",
        violation_type: "loudness_out_of_spec",
        message: `Integrated loudness (${analysis.integrated_lufs.toFixed(1)} LUFS) deviates from target of ${targetLufs} LUFS by ${lufsDelta.toFixed(1)} dB.`,
        suggested_fix: `Apply loudnorm filter (I=${targetLufs}:LRA=7:TP=-1.5) to normalize audio track.`,
      });
    }

    return violations;
  }
}
