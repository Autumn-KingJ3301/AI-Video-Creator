import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SceneIR, SceneIRSchema } from "../contracts/scene-ir.schema.js";

const ffmpegBin = ffmpegInstaller.path;
const ffprobeBin = ffprobeInstaller.path;

export interface RenderResult {
  outputPath: string;
  totalFrames: number;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  sceneClipPaths: string[];
}

export interface ProbeResult {
  width: number;
  height: number;
  duration: number;
  fps: number;
  nbFrames: number;
  hasAudio: boolean;
  videoCodec: string;
}

/**
 * Probe a video file using bundled ffprobe and extract exact stream metrics.
 */
export function probeVideo(filePath: string): ProbeResult {
  const args = [
    "-v", "error",
    "-show_entries", "stream=width,height,r_frame_rate,duration,nb_frames,codec_type,codec_name",
    "-show_entries", "format=duration",
    "-of", "json",
    filePath,
  ];

  const rawJson = execFileSync(ffprobeBin, args, { encoding: "utf-8" });
  const data = JSON.parse(rawJson);

  const videoStream = data.streams?.find((s: any) => s.codec_type === "video");
  const audioStream = data.streams?.find((s: any) => s.codec_type === "audio");

  if (!videoStream) {
    throw new Error(`No video stream found in probed file: ${filePath}`);
  }

  let fps = 30;
  if (videoStream.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
    fps = den ? Math.round(num / den) : 30;
  }

  const duration = Number(videoStream.duration || data.format?.duration || 0);
  const nbFrames = videoStream.nb_frames ? Number(videoStream.nb_frames) : Math.round(duration * fps);

  return {
    width: Number(videoStream.width),
    height: Number(videoStream.height),
    duration,
    fps,
    nbFrames,
    hasAudio: !!audioStream,
    videoCodec: String(videoStream.codec_name),
  };
}

/**
 * Executes Build Phase A Minimal Vertical Slice:
 * Renders individual scene clips matching Scene IR, mixes audio, and concatenates.
 */
export async function executeVerticalSlice(
  sceneIR: SceneIR,
  workDir: string,
  audioPath?: string
): Promise<RenderResult> {
  // Validate IR schema
  const ir = SceneIRSchema.parse(sceneIR);

  const clipsDir = join(workDir, "clips");
  const outDir = join(workDir, "out");
  if (!existsSync(clipsDir)) mkdirSync(clipsDir, { recursive: true });
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const fps = ir.fps;
  const width = 1080;
  const height = 1920;
  const sceneClipPaths: string[] = [];

  // Colors per scene for visual differentiation in vertical slice
  const sceneColors = ["#0B0F1A", "#141E33", "#1B2844", "#0A192F"];

  // 1. Render each scene to an independent, mute clip (REQ-REN-03)
  for (let i = 0; i < ir.scenes.length; i++) {
    const scene = ir.scenes[i];
    const durationFrames = scene.end_frame - scene.start_frame;
    const durationSeconds = durationFrames / fps;
    const clipPath = join(clipsDir, `${scene.id}.mp4`);
    const bgColor = sceneColors[i % sceneColors.length];

    // Safe area text placement: Y centered around 35% from top (well clear of top 14% and bottom 35%)
    // Moving animated box to demonstrate visual change within the scene
    const filterGraph = [
      `color=c=${bgColor}:s=${width}x${height}:d=${durationSeconds}:r=${fps}`,
      // Animated visual change element (moving horizontal highlight bar across duration)
      `drawbox=x=100:y=800+(t*50):w=${width - 200}:h=20:color=0x4DA3FF@0.8:t=fill`,
      // Title text inside safe zone
      `drawtext=text='[${scene.type.toUpperCase()}] ${scene.id}':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=500`,
      // Subtitle text inside safe zone
      `drawtext=text='${scene.intent.replace(/'/g, "")}':fontsize=36:fontcolor=0xF5F7FA:x=(w-text_w)/2:y=600`,
      // Frame counter landmark
      `drawtext=text='Frames %{n}':fontsize=32:fontcolor=0xFFC857:x=(w-text_w)/2:y=700`,
      `format=yuv420p`
    ].join(",");

    const renderArgs = [
      "-y",
      "-f", "lavfi",
      "-i", filterGraph,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-r", String(fps),
      "-t", String(durationSeconds),
      clipPath
    ];

    execFileSync(ffmpegBin, renderArgs, { stdio: "pipe" });
    sceneClipPaths.push(clipPath);
  }

  // 2. Prepare narration audio track if none provided
  const totalDurationSeconds = ir.total_frames / fps;
  let finalAudioPath = audioPath;
  if (!finalAudioPath || !existsSync(finalAudioPath)) {
    finalAudioPath = join(workDir, "master_narration.wav");
    // Generate clean tone audio of exact duration
    const audioArgs = [
      "-y",
      "-f", "lavfi",
      "-i", `sine=frequency=440:duration=${totalDurationSeconds}`,
      "-af", "volume=0.3",
      finalAudioPath,
    ];
    execFileSync(ffmpegBin, audioArgs, { stdio: "pipe" });
  }

  // 3. Compose final video using FFmpeg concat filter and mux audio (REQ-CMP-01)
  const concatListPath = join(workDir, "concat_list.txt");
  const concatContent = sceneClipPaths.map(p => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  writeFileSync(concatListPath, concatContent, "utf-8");

  const outputPath = join(outDir, "quick-tip-15s.mp4");
  const composeArgs = [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatListPath,
    "-i", finalAudioPath,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    outputPath,
  ];

  execFileSync(ffmpegBin, composeArgs, { stdio: "pipe" });

  const probe = probeVideo(outputPath);

  return {
    outputPath,
    totalFrames: probe.nbFrames,
    durationSeconds: probe.duration,
    width: probe.width,
    height: probe.height,
    fps: probe.fps,
    sceneClipPaths,
  };
}
