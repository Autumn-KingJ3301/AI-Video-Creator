import { SceneItem } from "../contracts/scene-ir.schema.js";
import { ProjectConfig } from "../contracts/project-config.schema.js";

export interface SceneRenderInput {
  scene: SceneItem;
  config: ProjectConfig;
  workDir: string;
  sourceCodePath?: string;
  isDraft?: boolean;
}

export interface SceneRenderOutput {
  sceneId: string;
  clipPath: string;
  durationFrames: number;
  width: number;
  height: number;
  fps: number;
  renderer: "remotion" | "manim";
  renderDurationMs: number;
}

export interface SceneRendererAdapter {
  readonly name: "remotion" | "manim";
  renderScene(input: SceneRenderInput): Promise<SceneRenderOutput>;
}
