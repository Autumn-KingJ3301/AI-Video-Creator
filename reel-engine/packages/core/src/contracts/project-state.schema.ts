import { z } from "zod";
import { ProjectConfigSchema } from "./project-config.schema.js";
import { SceneIRSchema } from "./scene-ir.schema.js";

export const EnginePhaseEnum = z.enum([
  "input",        // Initial brief or script/audio intake
  "transcribed",  // Audio speech-to-text and timestamps generated
  "planned",      // Scene IR authored and validated
  "authored",     // Scene code files generated (TSX / Python)
  "rendered",     // Independent scene clips rendered to disk
  "verified",     // Passed all 10 deterministic blocking gates & rubric
  "composed",     // Concat, captions burned, audio mixed
  "exported",     // Final video exported with edit list applied
]);

export const RubricScoreItemSchema = z.object({
  score: z.number().int().min(0).max(2),
  notes: z.string().optional(),
});

export const SelfReviewRubricSchema = z.object({
  hook: RubricScoreItemSchema,
  one_idea: RubricScoreItemSchema,
  pacing: RubricScoreItemSchema,
  legibility: RubricScoreItemSchema,
  motion: RubricScoreItemSchema,
  send_moment: RubricScoreItemSchema,
  payoff_and_loop: RubricScoreItemSchema,
});

export const GateViolationSeverityEnum = z.enum(["blocker", "advisory"]);

export const GateViolationSchema = z.object({
  gate_id: z.string(),
  scene_id: z.string().optional(),
  frame_range: z.tuple([z.number().int(), z.number().int()]).optional(),
  severity: GateViolationSeverityEnum,
  violation_type: z.string(),
  message: z.string(),
  evidence_frame: z.string().optional(),
  suggested_fix: z.string(),
});

export const QualityReportSchema = z.object({
  timestamp: z.string(),
  all_blocking_passed: z.boolean(),
  blocking_violations_count: z.number().int().nonnegative(),
  advisory_violations_count: z.number().int().nonnegative(),
  violations: z.array(GateViolationSchema).default([]),
  rubric: SelfReviewRubricSchema.optional(),
});

export const ToolResponseEnvelopeSchema = z.object({
  success: z.boolean(),
  phase: EnginePhaseEnum,
  status: z.enum(["ready", "in_progress", "completed", "blocked", "failed"]),
  next_step: z.string(),
  blocked_by: z.array(z.string()).default([]),
  data: z.any().optional(),
  error: z.string().optional(),
});

export const ProjectStateSchema = z.object({
  project_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  phase: EnginePhaseEnum.default("input"),
  brief: z.string().optional(),
  audio_path: z.string().optional(),
  transcript: z.array(z.object({
    word: z.string(),
    start_frame: z.number().int(),
    end_frame: z.number().int(),
  })).optional(),
  config: ProjectConfigSchema.default({}),
  scene_ir: SceneIRSchema.optional(),
  rendered_clips: z.record(z.string()).default({}), // scene_id -> clip_path
  quality_report: QualityReportSchema.optional(),
  output_video_path: z.string().optional(),
});

export type EnginePhase = z.infer<typeof EnginePhaseEnum>;
export type SelfReviewRubric = z.infer<typeof SelfReviewRubricSchema>;
export type GateViolation = z.infer<typeof GateViolationSchema>;
export type QualityReport = z.infer<typeof QualityReportSchema>;
export type ToolResponseEnvelope<T = any> = z.infer<typeof ToolResponseEnvelopeSchema> & { data?: T };
export type ProjectState = z.infer<typeof ProjectStateSchema>;
