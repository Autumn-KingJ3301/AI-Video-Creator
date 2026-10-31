import { describe, it, expect } from "vitest";
import { existsSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

import { TTSService } from "../../packages/core/src/timing/tts.service.js";
import { AudioProcessor } from "../../packages/core/src/timing/audio-processor.js";
import { DeterministicAligner } from "../../packages/core/src/timing/transcriber.mock.js";
import { PhraseAligner } from "../../packages/core/src/timing/phrase-aligner.js";
import { TimingSolver } from "../../packages/core/src/timing/timing-solver.js";
import { SceneBlueprint } from "../../packages/core/src/timing/contracts.js";
import { ProjectConfigSchema } from "../../packages/core/src/contracts/project-config.schema.js";
import { SceneIRSchema } from "../../packages/core/src/contracts/scene-ir.schema.js";
import { RemotionAdapter } from "../../packages/core/src/renderers/remotion.adapter.js";
import { ManimAdapter } from "../../packages/core/src/renderers/manim.adapter.js";
import { probeVideo } from "../../packages/core/src/engine/vertical-slice.js";

const ffmpegBin = ffmpegInstaller.path;

describe("Build Phase C: Audio-Driven Frame Timing Integration Pipeline", () => {
  const testWorkDir = resolve(__dirname, "../../fixtures/.audio_timing_test_run");

  it("should execute audio ingest -> pause tightening -> phrase alignment -> timing solver -> composition with 0 drift", async () => {
    // 1. Clean test work directory
    if (existsSync(testWorkDir)) {
      rmSync(testWorkDir, { recursive: true, force: true });
    }
    mkdirSync(testWorkDir, { recursive: true });

    const fullScript = [
      "AI generated code? Get a code audit. Launch confidently.",
      "Your audit includes issues in code, plain explanations, and prioritized fixes.",
      "Analyzing system reliability gradients and asymptotic loss models.",
      "Request a code audit and understand every risk before release."
    ].join(" ");

    // 2. Synthesize audio from script (TTS Dual-Mode pipeline)
    const tts = new TTSService();
    const rawAudioPath = join(testWorkDir, "raw_speech.wav");
    const ttsResult = await tts.synthesize(fullScript, rawAudioPath);
    expect(existsSync(ttsResult.outputPath)).toBe(true);
    expect(ttsResult.duration_s).toBeGreaterThan(2.0);

    // 3. Audio Intelligence: Pause tightening + -14 LUFS loudness normalization
    const processor = new AudioProcessor();
    const processedAudio = processor.processAudio(rawAudioPath, testWorkDir, {
      normalize_lufs: -14,
      tighten_pauses: true,
      tighten_threshold_s: 0.35,
      target_pause_s: 0.25,
    });

    expect(existsSync(processedAudio.outputPath)).toBe(true);
    expect(processedAudio.analysis.integrated_lufs).toBeGreaterThanOrEqual(-16.5);
    expect(processedAudio.analysis.integrated_lufs).toBeLessThanOrEqual(-11.5);
    expect(processedAudio.analysis.clipping_detected).toBe(false);

    // 4. Transcription & Word-Level Timestamp Alignment
    const transcriber = new DeterministicAligner();
    const transcript = await transcriber.transcribe(processedAudio.outputPath, fullScript);
    expect(transcript.words.length).toBeGreaterThan(15);

    // 5. Phrase Alignment & Caption Chunking (<= 7 words per phrase, dwell check, keyword selection)
    const phraseAligner = new PhraseAligner();
    const phrases = phraseAligner.alignPhrases(transcript.words, {
      maxWords: 7,
      readingSpeedCps: 18,
      fps: 30,
    });
    expect(phrases.length).toBeGreaterThanOrEqual(4);
    for (const p of phrases) {
      expect(p.words.length).toBeLessThanOrEqual(7);
      expect(p.keyword).toBeDefined();
    }

    // 6. Deterministic Timing Solver
    const config = ProjectConfigSchema.parse({
      format: { fps: 30 },
      pacing: { max_static_s: 2.5 },
      audio: { lead_frames: 3 },
    });

    const blueprints: SceneBlueprint[] = [
      {
        id: "s01",
        type: "hook",
        narration: "AI generated code? Get a code audit. Launch confidently.",
        intent: "Hook audience with audit value proposition",
        renderer: "remotion",
        layout: "editorial_hero",
      },
      {
        id: "s02",
        type: "beat",
        narration: "Your audit includes issues in code, plain explanations, and prioritized fixes.",
        intent: "Numbered step list card",
        renderer: "remotion",
        layout: "step_list_card",
      },
      {
        id: "s03",
        type: "proof",
        narration: "Analyzing system reliability gradients and asymptotic loss models.",
        intent: "Mathematical loss graph with terracotta gradient",
        renderer: "manim",
        layout: "vertical_math_graph",
      },
      {
        id: "s04",
        type: "payoff",
        narration: "Request a code audit and understand every risk before release.",
        intent: "Payoff card with request audit CTA button",
        renderer: "remotion",
        layout: "editorial_payoff_cta",
      },
    ];

    const solver = new TimingSolver();
    const timingResult = solver.solve({
      audioDurationSeconds: processedAudio.processedDuration_s,
      phrases,
      sceneBlueprints: blueprints,
      config,
    });

    expect(timingResult.driftFrames).toBe(0);
    expect(timingResult.scenes.length).toBe(4);
    expect(timingResult.staticIntervalsMaxSeconds).toBeLessThanOrEqual(2.55);

    // Verify contiguous scene boundaries
    for (let i = 0; i < timingResult.scenes.length - 1; i++) {
      expect(timingResult.scenes[i].end_frame).toBe(timingResult.scenes[i + 1].start_frame);
    }
    expect(timingResult.scenes[0].start_frame).toBe(0);
    expect(timingResult.scenes[3].end_frame).toBe(timingResult.totalFrames);

    // 7. Validate generated SceneIR against contract
    const sceneIR = SceneIRSchema.parse({
      $schema: "https://reel-engine.dev/schemas/v0.1/scene-ir.json",
      core_idea: "AI generated code requires independent audit to uncover risks and launch confidently.",
      total_frames: timingResult.totalFrames,
      fps: timingResult.fps,
      scenes: timingResult.scenes,
      edit_list: timingResult.editList,
    });
    expect(sceneIR.total_frames).toBe(timingResult.totalFrames);

    // 8. Render independent scene clips using Remotion and Manim adapters
    const remotionAdapter = new RemotionAdapter();
    const manimAdapter = new ManimAdapter();
    const renderedClips: string[] = [];

    // Provide math scene script for manim scene
    const mathScriptPath = join(testWorkDir, "math_scene.py");
    writeFileSync(mathScriptPath, `
from manim_worker.helpers import ReelScene

class Scene_s03(ReelScene):
    def construct(self):
        pass
`.trim(), "utf-8");

    for (const sc of sceneIR.scenes) {
      if (sc.renderer === "remotion") {
        const out = await remotionAdapter.renderScene({
          scene: sc,
          config,
          workDir: testWorkDir,
        });
        renderedClips.push(out.clipPath);
        expect(out.durationFrames).toBe(sc.end_frame - sc.start_frame);
      } else {
        const out = await manimAdapter.renderScene({
          scene: sc,
          config,
          workDir: testWorkDir,
          sourceCodePath: mathScriptPath,
        });
        renderedClips.push(out.clipPath);
        expect(out.durationFrames).toBe(sc.end_frame - sc.start_frame);
      }
    }

    expect(renderedClips.length).toBe(4);

    // 9. Concatenate scene clips and mux master audio
    const concatListPath = join(testWorkDir, "concat_list.txt");
    const concatContent = renderedClips.map(p => `file '${p.replace(/\\/g, "/")}'`).join("\n");
    writeFileSync(concatListPath, concatContent, "utf-8");

    const finalOutDir = join(testWorkDir, "out");
    mkdirSync(finalOutDir, { recursive: true });
    const finalMp4Path = join(finalOutDir, "audio-timed-reel.mp4");

    execFileSync(ffmpegBin, [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", concatListPath,
      "-i", processedAudio.outputPath,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      finalMp4Path,
    ], { stdio: "pipe" });

    // 10. Probe final composed reel and assert invariants
    const finalProbe = probeVideo(finalMp4Path);
    expect(finalProbe.width).toBe(1080);
    expect(finalProbe.height).toBe(1920);
    expect(finalProbe.fps).toBe(30);
    expect(finalProbe.nbFrames).toBe(timingResult.totalFrames);
    expect(finalProbe.hasAudio).toBe(true);
    expect(finalProbe.videoCodec).toBe("h264");
  }, 90000); // 90s timeout for complete synthesis + render + compose
});
