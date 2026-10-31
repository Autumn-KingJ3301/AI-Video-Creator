import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AudioMixer } from "../../../core/src/composer/audio-mixer.js";
import { Compositor } from "../../../core/src/composer/compositor.js";
import { EditListApplier } from "../../../core/src/composer/edit-list-applier.js";
import { ToolResponseEnvelope } from "../../../core/src/contracts/project-state.schema.js";
import { MCPToolHandler, ToolContext } from "./tool.interface.js";

export const composeVideoTool: MCPToolHandler = {
  name: "reel_compose_video",
  description: "Assembles active scene clips with transitions, layers background music with -12dB ducking, burns captions, and exports final 1080x1920 MP4.",
  definition: {
    name: "reel_compose_video",
    description: "Assembles active scene clips with transitions, layers background music with -12dB ducking, burns captions, and exports final 1080x1920 MP4.",
    inputSchema: {
      type: "object",
      properties: {
        music_path: { type: "string", description: "Path to optional background music audio track (WAV/MP3)" },
        duck_music_db: { type: "number", description: "Ducking level for background music under speech", default: -12 },
        captions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              start_frame: { type: "integer" },
              end_frame: { type: "integer" },
              text: { type: "string" },
              keyword: { type: "string" },
            },
            required: ["start_frame", "end_frame", "text"],
          },
        },
      },
    },
  },
  async execute(args: any, context: ToolContext): Promise<ToolResponseEnvelope> {
    const state = context.stateManager.getState();
    const sceneIR = state.scene_ir;

    if (!sceneIR) {
      return {
        success: false,
        phase: state.phase,
        status: "blocked",
        next_step: "reel_plan_scenes",
        blocked_by: ["MISSING_SCENE_IR: No Scene IR found"],
        error: "Missing Scene IR",
      };
    }

    if (!state.audio_path || !existsSync(state.audio_path)) {
      return {
        success: false,
        phase: state.phase,
        status: "blocked",
        next_step: "reel_transcribe_audio",
        blocked_by: ["MISSING_AUDIO: Master narration audio not found"],
        error: "Missing master audio",
      };
    }

    const outDir = join(context.workDir, "out");
    const cacheDir = join(context.workDir, ".cache");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    // 1. Process active clips through edit list applier
    const applier = new EditListApplier();
    const editResult = applier.apply(
      sceneIR.scenes,
      state.rendered_clips,
      sceneIR.edit_list,
      sceneIR.fps,
      join(cacheDir, "edits")
    );

    // 2. Mix & duck audio
    const mixer = new AudioMixer();
    const mixedAudioPath = join(cacheDir, "master_audio_mixed.wav");
    mixer.mix({
      speechPath: state.audio_path,
      musicPath: args.music_path,
      outputPath: mixedAudioPath,
      duckMusicDb: args.duck_music_db ?? state.config.audio?.duck_music_db ?? -12,
      targetLufs: state.config.audio?.loudness_lufs ?? -14,
      targetDurationSeconds: editResult.totalDurationSeconds,
    });

    // 3. Prepare clips with transitions
    const compClips = editResult.clips.map((c) => {
      const orig = sceneIR.scenes.find((s) => s.id === c.sceneId);
      return {
        sceneId: c.sceneId,
        clipPath: c.clipPath,
        transitionIn: orig?.transition_in || "hard_cut",
        durationFrames: c.durationFrames,
      };
    });

    // 4. Compose final MP4
    const compositor = new Compositor();
    const outputPath = join(outDir, `${state.project_id}_final.mp4`);

    const compResult = compositor.compose({
      sceneClips: compClips,
      audioPath: mixedAudioPath,
      outputPath,
      fps: sceneIR.fps,
      captions: args.captions,
      tempDir: join(cacheDir, "compose_temp"),
    });

    context.stateManager.update({
      phase: "exported",
      output_video_path: compResult.outputPath,
    });

    return {
      success: true,
      phase: "exported",
      status: "completed",
      next_step: "done",
      blocked_by: [],
      data: {
        output_path: compResult.outputPath,
        total_frames: compResult.totalFrames,
        duration_seconds: compResult.durationSeconds,
        width: compResult.width,
        height: compResult.height,
        fps: compResult.fps,
        encoder_used: compResult.encoderUsed,
      },
    };
  },
};
