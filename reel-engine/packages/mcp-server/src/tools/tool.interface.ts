import { ToolResponseEnvelope } from "../../../core/src/contracts/project-state.schema.js";
import { StateManager } from "../../../core/src/state/state-manager.js";
import { SceneCache } from "../../../core/src/cache/scene-cache.js";
import { MCPToolDefinition } from "../protocol/types.js";

export interface ToolContext {
  workDir: string;
  stateManager: StateManager;
  cache: SceneCache;
}

export interface MCPToolHandler {
  name: string;
  description: string;
  definition: MCPToolDefinition;
  execute(args: any, context: ToolContext): Promise<ToolResponseEnvelope<any>>;
}
