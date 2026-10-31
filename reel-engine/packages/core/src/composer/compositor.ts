import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { probeVideo } from "../engine/vertical-slice.js";

const ffmpegBin = ffmpegInstaller.path;

export interface CaptionItem {
  start_frame: number;
  end_frame: number;
  text: string;
  keyword?: string;
}

export interface ComposeSceneClip {
  sceneId: string;
  clipPath: string;
  transitionIn?: string;
  durationFrames?: number;
}

export interface CompositorOptions {
  sceneClips: ComposeSceneClip[];
  audioPath: string;
  outputPath: string;
  fps?: number;
  width?: number;
  height?: number;
  captions?: CaptionItem[];
  tempDir?: string;
  forceSoftwareEncoder?: boolean;
}

export interface CompositorResult {
  outputPath: string;
  totalFrames: number;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  encoderUsed: string;
}

export class Compositor {
  /**
   * Probes whether hardware-accelerated NVENC is available and functioning,
   * falling back to libx264 if unavailable or incompatible.
   */
  public probeHardwareEncoder(): { encoder: string; extraArgs: string[] } {
    const probeArgs = [
      "-y",
      "-f", "lavfi",
      "-i", "color=c=black:s=64x64:d=0.04:r=25",
      "-c:v", "h264_nvenc",
      "-f", "null",
      "-",
    ];
    const res = spawnSync(ffmpegBin, probeArgs, { encoding: "utf-8" });
    if (res.status === 0) {
      return {
        encoder: "h264_nvenc",
        extraArgs: ["-cq", "23"],
      };
    }
    return {
      encoder: "libx264",
      extraArgs: ["-crf", "23", "-preset", "veryfast"],
    };
  }

  /**
   * Applies entry transition effects (zoom_punch, mask_reveal, swipe) to a scene clip.
   */
  public applyTransition(
    clipPath: string,
    transitionType: string,
    fps: number,
    outPath: string
  ): string {
    if (!transitionType || transitionType === "hard_cut") {
      return clipPath;
    }

    let filter = "";
    if (transitionType === "zoom_punch") {
      // Fast zoom punch on opening 6 frames: scale up 1.1x and center crop
      filter = "scale=1.1*iw:1.1*ih,crop=1080:1920:(iw-1080)/2:(ih-1920)/2";
    } else if (transitionType === "mask_reveal") {
      // Warm ivory fade-in mask over 0.2s
      filter = "fade=t=in:st=0:d=0.2:color=0xF4F0EA";
    } else if (transitionType === "swipe") {
      // Wipe reveal from warm ivory
      filter = "fade=t=in:st=0:d=0.15:color=0xC84B22";
    } else {
      return clipPath;
    }

    const args = [
      "-y",
      "-i", clipPath,
      "-vf", filter,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-r", String(fps),
      outPath,
    ];

    const res = spawnSync(ffmpegBin, args, { encoding: "utf-8" });
    if (res.status !== 0) {
      // Fallback to original clip if transition filter fails
      return clipPath;
    }

    return outPath;
  }

  /**
   * Composes final video: applies transitions, burns captions, muxes audio,
   * and encodes using hardware acceleration (NVENC) or software fallback.
   */
  public compose(options: CompositorOptions): CompositorResult {
    if (options.sceneClips.length === 0) {
      throw new Error("Compositor requires at least one scene clip");
    }
    if (!existsSync(options.audioPath)) {
      throw new Error(`Master audio track not found: ${options.audioPath}`);
    }

    const fps = options.fps ?? 30;
    const width = options.width ?? 1080;
    const height = options.height ?? 1920;
    const tempDir = options.tempDir ?? ".cache/compose_temp";

    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    const outDir = dirname(options.outputPath);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    // 1. Process transitions on individual clips if needed
    const finalClipPaths: string[] = [];
    for (let i = 0; i < options.sceneClips.length; i++) {
      const item = options.sceneClips[i];
      if (item.transitionIn && item.transitionIn !== "hard_cut") {
        const transPath = join(tempDir, `trans_${item.sceneId}_${item.transitionIn}.mp4`);
        const processed = this.applyTransition(item.clipPath, item.transitionIn, fps, transPath);
        finalClipPaths.push(processed);
      } else {
        finalClipPaths.push(item.clipPath);
      }
    }

    // 2. Concat demuxer list
    const concatListPath = join(tempDir, "concat_list.txt");
    const concatContent = finalClipPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
    writeFileSync(concatListPath, concatContent, "utf-8");

    // 3. Encoder selection
    const { encoder, extraArgs } = options.forceSoftwareEncoder
      ? { encoder: "libx264", extraArgs: ["-crf", "23", "-preset", "veryfast"] }
      : this.probeHardwareEncoder();

    // 4. Build video filter chain (captions burn-in if provided)
    const vfFilters: string[] = [];
    if (options.captions && options.captions.length > 0) {
      for (const cap of options.captions) {
        const st = cap.start_frame / fps;
        const et = cap.end_frame / fps;
        const safeText = cap.text.replace(/'/g, "").replace(/:/g, "\\:");

        // Floating white card behind text
        vfFilters.push(
          `drawbox=x=80:y=620:w=920:h=90:color=white@0.95:t=fill:enable='between(t,${st},${et})'`
        );
        // Subtle warm border
        vfFilters.push(
          `drawbox=x=80:y=620:w=920:h=90:color=0xE6E0D5:t=2:enable='between(t,${st},${et})'`
        );
        // Kinetic caption text in Dark Charcoal
        vfFilters.push(
          `drawtext=text='${safeText}':fontsize=40:fontcolor=0x141413:x=(w-text_w)/2:y=645:enable='between(t,${st},${et})'`
        );
      }
    }

    // Ensure standard pixel format
    vfFilters.push("format=yuv420p");

    const totalDurationFrames = options.sceneClips.reduce(
      (acc, c) => acc + (c.durationFrames || 0),
      0
    );
    const targetDurSec = totalDurationFrames > 0 ? (totalDurationFrames / fps).toFixed(3) : undefined;

    const composeArgs = [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
      "-i", options.audioPath,
      "-vf", vfFilters.join(","),
      "-c:v", encoder,
      ...extraArgs,
      "-c:a", "aac",
      "-b:a", "192k",
      "-pix_fmt", "yuv420p",
      "-r", String(fps),
      ...(targetDurSec ? ["-t", String(targetDurSec)] : ["-shortest"]),
      options.outputPath,
    ];

    const res = spawnSync(ffmpegBin, composeArgs, { encoding: "utf-8" });
    if (res.status !== 0) {
      // If hardware encoder failed unexpectedly, fallback to libx264
      if (encoder !== "libx264") {
        const fallbackArgs = [
          "-y",
          "-f", "concat",
          "-safe", "0",
          "-i", concatListPath,
          "-i", options.audioPath,
          "-vf", vfFilters.join(","),
          "-c:v", "libx264",
          "-crf", "23",
          "-preset", "veryfast",
          "-c:a", "aac",
          "-b:a", "192k",
          "-pix_fmt", "yuv420p",
          "-r", String(fps),
          "-shortest",
          options.outputPath,
        ];
        const fbRes = spawnSync(ffmpegBin, fallbackArgs, { encoding: "utf-8" });
        if (fbRes.status !== 0) {
          throw new Error(`Compositor fallback encoding failed: ${fbRes.stderr}`);
        }
      } else {
        throw new Error(`Compositor encoding failed: ${res.stderr}`);
      }
    }

    const probe = probeVideo(options.outputPath);

    return {
      outputPath: options.outputPath,
      totalFrames: probe.nbFrames,
      durationSeconds: probe.duration,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      encoderUsed: encoder,
    };
  }
}
