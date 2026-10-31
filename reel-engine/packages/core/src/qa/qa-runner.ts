import { SceneIR } from "../contracts/scene-ir.schema.js";
import { ProjectConfig } from "../contracts/project-config.schema.js";
import { QualityReport, QualityReportSchema, GateViolation } from "../contracts/project-state.schema.js";
import { IRLinter } from "./ir-linter.js";
import { RubricEvaluator } from "./rubric-evaluator.js";
import { VideoInspector } from "./video-inspector.js";

export interface QARunnerInput {
  sceneIR: SceneIR;
  config: ProjectConfig;
  renderedClips?: Record<string, string>; // sceneId -> clipPath
  masterAudioPath?: string;
  skipMediaInspection?: boolean;
}

export class QARunner {
  private irLinter = new IRLinter();
  private rubricEvaluator = new RubricEvaluator();
  private videoInspector = new VideoInspector();

  /**
   * Executes the full deterministic QA battery and rubric evaluation.
   */
  run(input: QARunnerInput): QualityReport {
    const { sceneIR, config, renderedClips = {}, masterAudioPath, skipMediaInspection = false } = input;
    const allViolations: GateViolation[] = [];

    // 1. Pre-render Scene IR Linting
    const irViolations = this.irLinter.lint(sceneIR, config);
    allViolations.push(...irViolations);

    // 2. Director Self-Review Rubric
    const rubricResult = this.rubricEvaluator.evaluate(sceneIR, config);
    allViolations.push(...rubricResult.violations);

    // 3. Post-render Media Inspection (if clips and audio are supplied)
    if (!skipMediaInspection) {
      // Inspect each scene clip
      for (const sc of sceneIR.scenes) {
        const clipPath = renderedClips[sc.id];
        if (clipPath) {
          const expectedFrames = sc.end_frame - sc.start_frame;
          const clipViolations = this.videoInspector.inspectClip({
            clipPath,
            sceneId: sc.id,
            expectedFrames,
            fps: sceneIR.fps,
            maxStaticSeconds: config.pacing.max_static_s,
          });
          allViolations.push(...clipViolations);
        }
      }

      // Inspect master narration audio
      if (masterAudioPath) {
        const targetLufs = config.audio.loudness_lufs ?? -14;
        const audioViolations = this.videoInspector.inspectAudio(masterAudioPath, targetLufs);
        allViolations.push(...audioViolations);
      }
    }

    const blockers = allViolations.filter(v => v.severity === "blocker");
    const advisories = allViolations.filter(v => v.severity === "advisory");

    const report: QualityReport = {
      timestamp: new Date().toISOString(),
      all_blocking_passed: blockers.length === 0,
      blocking_violations_count: blockers.length,
      advisory_violations_count: advisories.length,
      violations: allViolations,
      rubric: rubricResult.rubric,
    };

    // Ensure report complies with contract schema
    return QualityReportSchema.parse(report);
  }
}
