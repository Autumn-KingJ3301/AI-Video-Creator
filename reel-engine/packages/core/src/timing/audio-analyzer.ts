import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { execFileSync, spawnSync } from "node:child_process";
import { AudioAnalysis, SilenceInterval } from "./contracts.js";

const ffmpegBin = ffmpegInstaller.path;
const ffprobeBin = ffprobeInstaller.path;

export class AudioAnalyzer {
  /**
   * Probes duration and basic stream metrics of an audio file.
   */
  getDuration(audioPath: string): number {
    const args = [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "json",
      audioPath,
    ];
    const raw = execFileSync(ffprobeBin, args, { encoding: "utf-8" });
    const data = JSON.parse(raw);
    return Number(data.format?.duration || 0);
  }

  /**
   * Detects silences in the audio track that exceed minDurationSeconds at noiseThresholdDb.
   */
  detectSilences(audioPath: string, noiseThresholdDb: number = -30, minDurationSeconds: number = 0.35): SilenceInterval[] {
    const filter = `silencedetect=noise=${noiseThresholdDb}dB:d=${minDurationSeconds}`;
    const args = [
      "-y",
      "-i", audioPath,
      "-af", filter,
      "-f", "null",
      "-",
    ];

    const res = spawnSync(ffmpegBin, args, { encoding: "utf-8" });
    const stderr = res.stderr || "";

    const silences: SilenceInterval[] = [];
    let currentStart: number | null = null;

    // Line-by-line parsing to maintain order
    const lines = stderr.split(/\r?\n/);
    for (const line of lines) {
      const startMatch = line.match(/silence_start:\s*([0-9.]+)/);
      if (startMatch) {
        currentStart = parseFloat(startMatch[1]);
      }
      const endMatch = line.match(/silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/);
      if (endMatch) {
        const end = parseFloat(endMatch[1]);
        const dur = parseFloat(endMatch[2]);
        const start = currentStart !== null ? currentStart : Math.max(0, end - dur);
        silences.push({
          start_s: start,
          end_s: end,
          duration_s: dur,
        });
        currentStart = null;
      }
    }

    return silences;
  }

  /**
   * Measures integrated loudness (LUFS), True Peak (dB), and Loudness Range (LRA) via loudnorm probe.
   */
  measureLoudness(audioPath: string): { integrated_lufs: number; true_peak_db: number; lra: number } {
    const args = [
      "-y",
      "-i", audioPath,
      "-af", "loudnorm=I=-14:LRA=7:TP=-1.5:print_format=json",
      "-f", "null",
      "-",
    ];

    const res = spawnSync(ffmpegBin, args, { encoding: "utf-8" });
    const stderr = res.stderr || "";

    // Extract JSON block from stderr
    const jsonMatch = stderr.match(/\{[\s\S]*"input_i"[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback defaults if audio is too short or silent
      return {
        integrated_lufs: -14.0,
        true_peak_db: -1.5,
        lra: 5.0,
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        integrated_lufs: parseFloat(parsed.input_i),
        true_peak_db: parseFloat(parsed.input_tp),
        lra: parseFloat(parsed.input_lra),
      };
    } catch {
      return {
        integrated_lufs: -14.0,
        true_peak_db: -1.5,
        lra: 5.0,
      };
    }
  }

  /**
   * Performs full acoustic analysis on an audio file.
   */
  analyze(audioPath: string, minSilenceDuration: number = 0.35): AudioAnalysis {
    const duration_s = this.getDuration(audioPath);
    const silences = this.detectSilences(audioPath, -30, minSilenceDuration);
    const loudness = this.measureLoudness(audioPath);

    return {
      duration_s,
      integrated_lufs: loudness.integrated_lufs,
      true_peak_db: loudness.true_peak_db,
      lra: loudness.lra,
      silences,
      clipping_detected: loudness.true_peak_db > -0.5,
    };
  }
}
