import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ToolResponseEnvelope } from "../../../core/src/contracts/project-state.schema.js";
import { AudioProcessor } from "../../../core/src/timing/audio-processor.js";
import { DeterministicAligner } from "../../../core/src/timing/transcriber.mock.js";
import { TTSService } from "../../../core/src/timing/tts.service.js";
import { MCPToolHandler, ToolContext } from "./tool.interface.js";

export const transcribeAudioTool: MCPToolHandler = {
  name: "reel_transcribe_audio",
  description: "Ingests voiceover audio or synthesizes narration from script text via TTS, tightens pauses, normalizes loudness, and extracts word timestamps.",
  definition: {
    name: "reel_transcribe_audio",
    description: "Ingests voiceover audio or synthesizes narration from script text via TTS, tightens pauses, normalizes loudness, and extracts word timestamps.",
    inputSchema: {
      type: "object",
      properties: {
        audio_path: { type: "string", description: "Path to existing voiceover audio file (WAV/MP3)" },
        script_text: { type: "string", description: "Narration script text to synthesize using native TTS" },
        voice_id: { type: "string", description: "Voice ID for TTS synthesis", default: "af_heart" },
      },
    },
  },
  async execute(args: any, context: ToolContext): Promise<ToolResponseEnvelope> {
    const audioDir = join(context.workDir, ".audio");
    if (!existsSync(audioDir)) mkdirSync(audioDir, { recursive: true });

    let finalAudioPath = args.audio_path;
    let fullScript = args.script_text;

    // 1. Synthesize from script text if audio not provided
    if (!finalAudioPath && fullScript) {
      const tts = new TTSService();
      const rawWav = join(audioDir, "tts_raw.wav");
      await tts.synthesize(fullScript, rawWav, args.voice_id);

      // Process audio: tighten pauses and normalize to -14 LUFS
      const processor = new AudioProcessor();
      const processRes = processor.processAudio(rawWav, audioDir, {
        normalize_lufs: -14.0,
        tighten_pauses: true,
        tighten_threshold_s: 0.35,
      });
      finalAudioPath = processRes.outputPath;
    }

    if (!finalAudioPath || !existsSync(finalAudioPath)) {
      return {
        success: false,
        phase: "input",
        status: "blocked",
        next_step: "reel_transcribe_audio",
        blocked_by: ["MISSING_AUDIO_SOURCE: Must provide either valid audio_path or script_text"],
        error: "Missing audio source",
      };
    }

    // 2. Transcribe & align word timestamps
    const aligner = new DeterministicAligner();
    const transcript = await aligner.transcribe(finalAudioPath, fullScript);

    const transcriptItems = transcript.words.map((w) => ({
      word: w.word,
      start_frame: Math.round(w.start_s * 30),
      end_frame: Math.round(w.end_s * 30),
    }));

    context.stateManager.update({
      phase: "transcribed",
      audio_path: finalAudioPath,
      transcript: transcriptItems,
    });

    return {
      success: true,
      phase: "transcribed",
      status: "ready",
      next_step: "reel_plan_scenes",
      blocked_by: [],
      data: {
        audio_path: finalAudioPath,
        duration_seconds: transcript.duration_s,
        word_count: transcript.words.length,
        transcript: transcriptItems,
      },
    };
  },
};
