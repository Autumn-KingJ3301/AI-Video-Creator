import { SceneItem, SceneType, EditList } from "../contracts/scene-ir.schema.js";
import { ProjectConfig } from "../contracts/project-config.schema.js";

export interface WordTimestamp {
  word: string;
  start_s: number;
  end_s: number;
  confidence: number;
}

export interface PhraseSegment {
  id: string;
  text: string;
  words: WordTimestamp[];
  start_s: number;
  end_s: number;
  start_frame: number;
  end_frame: number;
  keyword: string;
}

export interface SilenceInterval {
  start_s: number;
  end_s: number;
  duration_s: number;
}

export interface AudioAnalysis {
  duration_s: number;
  integrated_lufs: number;
  true_peak_db: number;
  lra: number;
  silences: SilenceInterval[];
  clipping_detected: boolean;
}

export interface AudioProcessOptions {
  normalize_lufs?: number;
  tighten_pauses?: boolean;
  tighten_threshold_s?: number;
  target_pause_s?: number;
}

export interface AudioProcessResult {
  outputPath: string;
  originalDuration_s: number;
  processedDuration_s: number;
  analysis: AudioAnalysis;
  timeMap?: {
    original_s: number;
    tightened_s: number;
  }[];
}

export interface SceneBlueprint {
  id: string;
  type: SceneType;
  narration: string;
  intent: string;
  renderer: "remotion" | "manim";
  layout: string;
  transition_in?: string;
  send_moment?: boolean;
}

export interface TimingSolveInput {
  audioDurationSeconds: number;
  phrases: PhraseSegment[];
  sceneBlueprints: SceneBlueprint[];
  config: ProjectConfig;
}

export interface TimingSolveResult {
  totalFrames: number;
  fps: number;
  scenes: SceneItem[];
  editList: EditList;
  staticIntervalsMaxSeconds: number;
  driftFrames: number; // Invariant: must equal 0
}
