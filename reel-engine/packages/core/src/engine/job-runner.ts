import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { computeSceneCacheKey } from "../cache/cache-key.js";
import { SceneCache } from "../cache/scene-cache.js";
import { AudioMixer } from "../composer/audio-mixer.js";
import { Compositor } from "../composer/compositor.js";
import { EditListApplier } from "../composer/edit-list-applier.js";
import { ProjectConfig } from "../contracts/project-config.schema.js";
import { EnginePhase, ProjectState } from "../contracts/project-state.schema.js";
import { SceneIR, SceneItem } from "../contracts/scene-ir.schema.js";
import { QARunner } from "../qa/qa-runner.js";
import { StateManager } from "../state/state-manager.js";

export type SceneRenderFunction = (scene: SceneItem, workDir: string) => Promise<string>;

export interface JobRunnerOptions {
  workDir: string;
  projectConfig: ProjectConfig;
  sceneIR: SceneIR;
  masterAudioPath: string;
  musicPath?: string;
  sceneRenderer: SceneRenderFunction;
  sceneCodeMap?: Record<string, string>; // sceneId -> source code
  themeTokens?: Record<string, any>;
  forceReRender?: boolean;
  skipQA?: boolean;
}

export interface JobRunnerResult {
  projectId: string;
  phase: EnginePhase;
  outputVideoPath: string;
  totalFrames: number;
  durationSeconds: number;
  renderedClips: Record<string, string>;
  cachedCount: number;
  renderedCount: number;
}

export class JobRunner {
  private stateManager: StateManager;
  private cache: SceneCache;
  private audioMixer: AudioMixer;
  private editListApplier: EditListApplier;
  private compositor: Compositor;
  private qaRunner: QARunner;

  constructor(workDir: string) {
    const statePath = join(workDir, ".state", "project-state.json");
    const cacheDir = join(workDir, ".cache");

    this.stateManager = new StateManager(statePath);
    this.cache = new SceneCache(cacheDir);
    this.audioMixer = new AudioMixer();
    this.editListApplier = new EditListApplier();
    this.compositor = new Compositor();
    this.qaRunner = new QARunner();
  }

  public getState(): ProjectState {
    return this.stateManager.getState();
  }

  /**
   * Runs the video generation pipeline with intelligent caching, quality gates,
   * audio ducking, and atomic state recovery.
   */
  public async run(options: JobRunnerOptions): Promise<JobRunnerResult> {
    const { workDir, projectConfig, sceneIR, masterAudioPath, musicPath, sceneRenderer } = options;

    const clipsDir = join(workDir, "clips");
    const outDir = join(workDir, "out");
    if (!existsSync(clipsDir)) mkdirSync(clipsDir, { recursive: true });
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    // 1. Initialize or resume project state
    this.stateManager.update({
      config: projectConfig,
      scene_ir: sceneIR,
      audio_path: masterAudioPath,
    });

    const renderedClips: Record<string, string> = {
      ...this.stateManager.getState().rendered_clips,
    };

    let cachedCount = 0;
    let renderedCount = 0;

    // 2. Render scenes with Content-Addressed Caching
    for (const scene of sceneIR.scenes) {
      const sceneCode = options.sceneCodeMap?.[scene.id] || "";
      const cacheKey = computeSceneCacheKey({
        scene,
        code: sceneCode,
        themeTokens: options.themeTokens,
        audioPath: masterAudioPath,
      });

      const isCached = !options.forceReRender && this.cache.has(cacheKey);

      if (isCached) {
        const cachedPath = this.cache.get(cacheKey)!;
        renderedClips[scene.id] = cachedPath;
        cachedCount++;
      } else {
        // Cache miss: render via supplied renderer function
        const renderedClipPath = await sceneRenderer(scene, workDir);
        const storedPath = this.cache.put(cacheKey, renderedClipPath, { sceneId: scene.id });
        renderedClips[scene.id] = storedPath;
        renderedCount++;
      }
    }

    this.stateManager.update({
      phase: "rendered",
      rendered_clips: renderedClips,
    });

    // 3. QA Gates & Director Rubric
    if (!options.skipQA) {
      const qaReport = this.qaRunner.run({
        sceneIR,
        config: projectConfig,
        renderedClips,
        masterAudioPath,
      });

      this.stateManager.update({ quality_report: qaReport });

      if (!qaReport.all_blocking_passed) {
        const blockerMsgs = qaReport.violations
          .filter((v) => v.severity === "blocker")
          .map((v) => `[${v.gate_id}] ${v.message}`)
          .join("; ");
        throw new Error(`QA Gates Blocked video generation: ${blockerMsgs}`);
      }

      this.stateManager.update({ phase: "verified" });
    }

    // 4. Apply Non-Destructive Edit List
    const editResult = this.editListApplier.apply(
      sceneIR.scenes,
      renderedClips,
      sceneIR.edit_list,
      sceneIR.fps,
      join(workDir, ".cache", "edits")
    );

    // 5. Audio Ducking & Layering
    const mixedAudioPath = join(workDir, ".cache", "master_mixed.wav");
    this.audioMixer.mix({
      speechPath: masterAudioPath,
      musicPath,
      outputPath: mixedAudioPath,
      duckMusicDb: projectConfig.audio?.duck_music_db ?? -12,
      targetLufs: projectConfig.audio?.loudness_lufs ?? -14,
      targetDurationSeconds: editResult.totalDurationSeconds,
    });

    // 6. Final Composition & Export
    const finalOutputPath = join(outDir, `${this.stateManager.getState().project_id}_final.mp4`);

    const compSceneClips = editResult.clips.map((c) => {
      const originalScene = sceneIR.scenes.find((s) => s.id === c.sceneId);
      return {
        sceneId: c.sceneId,
        clipPath: c.clipPath,
        transitionIn: originalScene?.transition_in || "hard_cut",
        durationFrames: c.durationFrames,
      };
    });

    const compResult = this.compositor.compose({
      sceneClips: compSceneClips,
      audioPath: mixedAudioPath,
      outputPath: finalOutputPath,
      fps: sceneIR.fps,
      tempDir: join(workDir, ".cache", "compose_temp"),
    });

    this.stateManager.update({
      phase: "exported",
      output_video_path: compResult.outputPath,
    });

    return {
      projectId: this.stateManager.getState().project_id,
      phase: "exported",
      outputVideoPath: compResult.outputPath,
      totalFrames: compResult.totalFrames,
      durationSeconds: compResult.durationSeconds,
      renderedClips,
      cachedCount,
      renderedCount,
    };
  }
}
