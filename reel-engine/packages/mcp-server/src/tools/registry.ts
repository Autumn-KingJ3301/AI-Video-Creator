import { MCPToolDefinition } from "../protocol/types.js";
import { ToolResponseEnvelope } from "../../../core/src/contracts/project-state.schema.js";
import { MCPToolHandler, ToolContext } from "./tool.interface.js";
import { initProjectTool } from "./init-project.js";
import { transcribeAudioTool } from "./transcribe-audio.js";
import { planScenesTool } from "./plan-scenes.js";
import { lintSceneIRTool } from "./lint-scene-ir.js";
import { authorSceneTool } from "./author-scene.js";
import { renderSceneTool } from "./render-scene.js";
import { verifyQualityTool } from "./verify-quality.js";
import { applyEditsTool } from "./apply-edits.js";
import { composeVideoTool } from "./compose-video.js";
import { getStateTool } from "./get-state.js";

export class ToolRegistry {
  private tools: Map<string, MCPToolHandler> = new Map();

  constructor() {
    this.register(initProjectTool);
    this.register(transcribeAudioTool);
    this.register(planScenesTool);
    this.register(lintSceneIRTool);
    this.register(authorSceneTool);
    this.register(renderSceneTool);
    this.register(verifyQualityTool);
    this.register(applyEditsTool);
    this.register(composeVideoTool);
    this.register(getStateTool);
  }

  public register(tool: MCPToolHandler): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): MCPToolHandler | undefined {
    return this.tools.get(name);
  }

  public getAllDefinitions(): MCPToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  public async execute(name: string, args: any, context: ToolContext): Promise<ToolResponseEnvelope> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        phase: context.stateManager.getState().phase,
        status: "failed",
        next_step: "reel_get_state",
        blocked_by: [`TOOL_NOT_FOUND: Tool '${name}' is not registered`],
        error: `Tool '${name}' not found`,
      };
    }

    try {
      return await tool.execute(args, context);
    } catch (err: any) {
      return {
        success: false,
        phase: context.stateManager.getState().phase,
        status: "failed",
        next_step: "reel_get_state",
        blocked_by: [`EXECUTION_ERROR: ${err?.message || err}`],
        error: err?.message || String(err),
      };
    }
  }
}
