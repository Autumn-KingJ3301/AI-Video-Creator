import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { AudioAnalyzer } from "../timing/audio-analyzer.js";

const ffmpegBin = ffmpegInstaller.path;

export interface AudioMixOptions {
  speechPath: string;
  musicPath?: string;
  outputPath: string;
  duckMusicDb?: number; // e.g. -12 dB
  targetLufs?: number; // e.g. -14 LUFS
  targetDurationSeconds?: number;
  musicBaseVolume?: number; // base music gain, e.g. 0.2 (-14 dB)
}

export interface AudioMixResult {
  outputPath: string;
  durationSeconds: number;
  integratedLufs: number;
  truePeakDb: number;
  ducked: boolean;
}

export class AudioMixer {
  private analyzer: AudioAnalyzer;

  constructor() {
    this.analyzer = new AudioAnalyzer();
  }

  /**
   * Mixes narration speech with optional background music.
   * Background music is looped if necessary and ducked by duckMusicDb (-12 dB)
   * during speech intervals using sidechain compression.
   * The final mixed track is normalized to targetLufs (-14.0 LUFS).
   */
  public mix(options: AudioMixOptions): AudioMixResult {
    if (!existsSync(options.speechPath)) {
      throw new Error(`Speech audio file does not exist: ${options.speechPath}`);
    }

    const outDir = dirname(options.outputPath);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    const speechDuration = this.analyzer.getDuration(options.speechPath);
    const finalDuration = options.targetDurationSeconds ?? speechDuration;
    const targetLufs = options.targetLufs ?? -14.0;
    const duckDb = options.duckMusicDb ?? -12;
    const musicBaseVol = options.musicBaseVolume ?? 0.25;

    // Case 1: No music track provided or file doesn't exist
    if (!options.musicPath || !existsSync(options.musicPath)) {
      const normFilter = `loudnorm=I=${targetLufs}:LRA=7:TP=-1.5,apad,atrim=0:${finalDuration}`;
      const args = [
        "-y",
        "-i", options.speechPath,
        "-af", normFilter,
        "-ar", "44100",
        "-ac", "1",
        "-t", String(finalDuration),
        options.outputPath,
      ];
      const res = spawnSync(ffmpegBin, args, { encoding: "utf-8" });
      if (res.status !== 0) {
        throw new Error(`Failed to normalize single speech audio: ${res.stderr}`);
      }

      const analysis = this.analyzer.analyze(options.outputPath);
      return {
        outputPath: options.outputPath,
        durationSeconds: analysis.duration_s,
        integratedLufs: analysis.integrated_lufs,
        truePeakDb: analysis.true_peak_db,
        ducked: false,
      };
    }

    // Case 2: Speech + Background Music with Ducking
    // Map duckDb to compression ratio: -12 dB -> ratio ~ 8:1
    const ratio = Math.max(2, Math.min(20, Math.round(Math.abs(duckDb) * 0.7)));

    // Complex filter:
    // 1. Format speech to stereo and split into main mix + sidechain trigger
    // 2. Format music to stereo and compress when speech triggers
    // 3. Mix main speech with ducked music
    // 4. Normalize to target LUFS
    const filterComplex = [
      `[0:a]aformat=sample_rates=44100:channel_layouts=stereo,apad,atrim=0:${finalDuration},asplit=2[sp_main][sp_sc]`,
      `[1:a]volume=${musicBaseVol},aformat=sample_rates=44100:channel_layouts=stereo[bgm]`,
      `[bgm][sp_sc]sidechaincompress=threshold=0.03:ratio=${ratio}:attack=20:release=250[ducked]`,
      `[sp_main][ducked]amix=inputs=2:duration=first:dropout_transition=2[mixed]`,
      `[mixed]loudnorm=I=${targetLufs}:LRA=7:TP=-1.5[outa]`,
    ].join(";");

    const mixArgs = [
      "-y",
      "-i", options.speechPath,
      "-stream_loop", "-1",
      "-i", options.musicPath,
      "-filter_complex", filterComplex,
      "-map", "[outa]",
      "-ar", "44100",
      "-ac", "2",
      "-t", String(finalDuration),
      options.outputPath,
    ];

    const mixRes = spawnSync(ffmpegBin, mixArgs, { encoding: "utf-8" });
    if (mixRes.status !== 0) {
      throw new Error(`FFmpeg audio mix and ducking failed: ${mixRes.stderr}`);
    }

    const mixedAnalysis = this.analyzer.analyze(options.outputPath);

    return {
      outputPath: options.outputPath,
      durationSeconds: mixedAnalysis.duration_s,
      integratedLufs: mixedAnalysis.integrated_lufs,
      truePeakDb: mixedAnalysis.true_peak_db,
      ducked: true,
    };
  }
}
