import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AudioAnalyzer } from "./audio-analyzer.js";
import { AudioProcessOptions, AudioProcessResult } from "./contracts.js";

const ffmpegBin = ffmpegInstaller.path;

export class AudioProcessor {
  private analyzer = new AudioAnalyzer();

  /**
   * Converts any input audio file to standard 44.1kHz 16-bit mono WAV.
   */
  standardizeFormat(inputPath: string, outputPath: string): void {
    const outDir = join(outputPath, "..");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const args = [
      "-y",
      "-i", inputPath,
      "-vn",
      "-ar", "44100",
      "-ac", "1",
      "-c:a", "pcm_s16le",
      outputPath,
    ];
    execFileSync(ffmpegBin, args, { stdio: "pipe" });
  }

  /**
   * Applies FFmpeg loudnorm filter to normalize audio to target LUFS (default -14 LUFS).
   */
  normalizeLoudness(inputPath: string, outputPath: string, targetLufs: number = -14): void {
    const outDir = join(outputPath, "..");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const filter = `loudnorm=I=${targetLufs}:LRA=7:TP=-1.5`;
    const args = [
      "-y",
      "-i", inputPath,
      "-af", filter,
      "-ar", "44100",
      "-ac", "1",
      "-c:a", "pcm_s16le",
      outputPath,
    ];
    execFileSync(ffmpegBin, args, { stdio: "pipe" });
  }

  /**
   * Tightens speech pauses longer than threshold down to targetPauseSeconds,
   * returning the tightened audio file and an exact timestamp mapping.
   */
  tightenPauses(
    inputPath: string,
    outputPath: string,
    thresholdSeconds: number = 0.35,
    targetPauseSeconds: number = 0.25
  ): {
    outputPath: string;
    originalDuration_s: number;
    tightenedDuration_s: number;
    timeMap: { original_s: number; tightened_s: number }[];
  } {
    const originalDuration = this.analyzer.getDuration(inputPath);
    const silences = this.analyzer.detectSilences(inputPath, -30, thresholdSeconds);
    const totalSilenceDur = silences.reduce((acc, s) => acc + s.duration_s, 0);

    // If no long silences exist or silences encompass virtually the entire file (>90%),
    // copy standardized audio directly to prevent audio collapse.
    if (silences.length === 0 || (originalDuration > 2.0 && totalSilenceDur >= originalDuration * 0.9)) {
      this.standardizeFormat(inputPath, outputPath);
      return {
        outputPath,
        originalDuration_s: originalDuration,
        tightenedDuration_s: originalDuration,
        timeMap: [
          { original_s: 0, tightened_s: 0 },
          { original_s: originalDuration, tightened_s: originalDuration },
        ],
      };
    }

    // Build speech intervals with tightened pauses
    // For each silence [start, end], we preserve targetPauseSeconds / 2 at start and end
    const speechSegments: { start: number; end: number }[] = [];
    let lastEnd = 0;
    const halfPause = targetPauseSeconds / 2;

    for (const silence of silences) {
      const segStart = lastEnd;
      const segEnd = Math.min(originalDuration, silence.start_s + halfPause);
      if (segEnd > segStart) {
        speechSegments.push({ start: segStart, end: segEnd });
      }
      lastEnd = Math.max(0, silence.end_s - halfPause);
    }

    if (lastEnd < originalDuration) {
      speechSegments.push({ start: lastEnd, end: originalDuration });
    }

    // Build FFmpeg filtergraph to trim and concatenate speech segments
    const filterParts: string[] = [];
    const concatInputs: string[] = [];

    const timeMap: { original_s: number; tightened_s: number }[] = [
      { original_s: 0, tightened_s: 0 },
    ];
    let runningTightenedTime = 0;

    for (let i = 0; i < speechSegments.length; i++) {
      const seg = speechSegments[i];
      const segDur = seg.end - seg.start;
      filterParts.push(`[0:a]atrim=start=${seg.start.toFixed(4)}:end=${seg.end.toFixed(4)},asetpts=PTS-STARTPTS[a${i}]`);
      concatInputs.push(`[a${i}]`);

      timeMap.push({ original_s: seg.start, tightened_s: runningTightenedTime });
      runningTightenedTime += segDur;
      timeMap.push({ original_s: seg.end, tightened_s: runningTightenedTime });
    }

    timeMap.push({ original_s: originalDuration, tightened_s: runningTightenedTime });

    filterParts.push(`${concatInputs.join("")}concat=n=${speechSegments.length}:v=0:a=1[outa]`);

    const args = [
      "-y",
      "-i", inputPath,
      "-filter_complex", filterParts.join(";"),
      "-map", "[outa]",
      "-ar", "44100",
      "-ac", "1",
      "-c:a", "pcm_s16le",
      outputPath,
    ];

    execFileSync(ffmpegBin, args, { stdio: "pipe" });

    const tightenedDuration = this.analyzer.getDuration(outputPath);

    return {
      outputPath,
      originalDuration_s: originalDuration,
      tightenedDuration_s: tightenedDuration,
      timeMap,
    };
  }

  /**
   * Maps an original timestamp to its tightened counterpart using the piecewise linear timeMap.
   */
  mapTimeToTightened(originalTime_s: number, timeMap: { original_s: number; tightened_s: number }[]): number {
    if (!timeMap || timeMap.length === 0) return originalTime_s;
    if (originalTime_s <= timeMap[0].original_s) return timeMap[0].tightened_s;
    const last = timeMap[timeMap.length - 1];
    if (originalTime_s >= last.original_s) return last.tightened_s;

    for (let i = 0; i < timeMap.length - 1; i++) {
      const p1 = timeMap[i];
      const p2 = timeMap[i + 1];
      if (originalTime_s >= p1.original_s && originalTime_s <= p2.original_s) {
        const origSpan = p2.original_s - p1.original_s;
        if (origSpan === 0) return p1.tightened_s;
        const progress = (originalTime_s - p1.original_s) / origSpan;
        return p1.tightened_s + progress * (p2.tightened_s - p1.tightened_s);
      }
    }

    return originalTime_s;
  }

  /**
   * End-to-end audio processing: standardizes, tightens pauses (if enabled), and normalizes loudness.
   */
  processAudio(inputPath: string, workDir: string, options: AudioProcessOptions = {}): AudioProcessResult {
    const rawStandardWav = join(workDir, "audio_standard.wav");
    this.standardizeFormat(inputPath, rawStandardWav);
    const origDuration = this.analyzer.getDuration(rawStandardWav);

    let currentPath = rawStandardWav;
    let timeMap: { original_s: number; tightened_s: number }[] | undefined;
    let tightenedDuration = origDuration;

    if (options.tighten_pauses) {
      const tightenedWav = join(workDir, "audio_tightened.wav");
      const tightenRes = this.tightenPauses(
        currentPath,
        tightenedWav,
        options.tighten_threshold_s ?? 0.35,
        options.target_pause_s ?? 0.25
      );
      currentPath = tightenRes.outputPath;
      timeMap = tightenRes.timeMap;
      tightenedDuration = tightenRes.tightenedDuration_s;
    }

    const normalizedWav = join(workDir, "master_narration.wav");
    const targetLufs = options.normalize_lufs ?? -14;
    this.normalizeLoudness(currentPath, normalizedWav, targetLufs);

    const finalAnalysis = this.analyzer.analyze(normalizedWav);

    return {
      outputPath: normalizedWav,
      originalDuration_s: origDuration,
      processedDuration_s: tightenedDuration,
      analysis: finalAnalysis,
      timeMap,
    };
  }
}
