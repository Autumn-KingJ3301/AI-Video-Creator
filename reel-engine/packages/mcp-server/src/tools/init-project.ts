import { CorselaTheme } from "../../../core/src/theme/tokens.js";
import { ProjectConfigSchema } from "../../../core/src/contracts/project-config.schema.js";
import { ToolResponseEnvelope } from "../../../core/src/contracts/project-state.schema.js";
import { MCPToolHandler, ToolContext } from "./tool.interface.js";

export const initProjectTool: MCPToolHandler = {
  name: "reel_init_project",
  description: "Initializes a new Reel Engine video project, sets the creative brief, and configures styling/pacing presets.",
  definition: {
    name: "reel_init_project",
    description: "Initializes a new Reel Engine video project, sets the creative brief, and configures styling/pacing presets.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Unique project ID (e.g. proj_audit_tip)" },
        brief: { type: "string", description: "The core idea or brief of the video" },
        preset: { type: "string", enum: ["corsela_editorial", "quick_tip", "explainer", "concept_math"], default: "corsela_editorial" },
        config: { type: "object", description: "Optional overrides for ProjectConfig" },
      },
      required: ["brief"],
    },
  },
  async execute(args: any, context: ToolContext): Promise<ToolResponseEnvelope> {
    const brief = args.brief || "";
    const projectId = args.project_id || `proj_${Date.now()}`;

    // Base config with Corsela editorial theme defaults
    const baseConfig = {
      format: { width: 1080, height: 1920, fps: 30 },
      style: {
        preset: "corsela_editorial",
        palette: [
          CorselaTheme.colors.background,     // index 0: #F4F0EA (Warm Ivory Canvas)
          CorselaTheme.colors.foreground,     // index 1: #141413 (Dark Charcoal Text)
          CorselaTheme.colors.accent,         // index 2: #C84B22 (Terracotta Accent)
          CorselaTheme.colors.cardBackground, // index 3: #FFFFFF (Floating White Card)
        ],
      },
      audio: { loudness_lufs: -14.0, duck_music_db: -12 },
      pacing: { max_static_s: 2.5, hook_deadline_s: 1.0, hook_complete_s: 3.0 },
      export: { encoder: "h264_nvenc", hardware_acceleration: true },
      ...(args.config || {}),
    };

    const parsedConfig = ProjectConfigSchema.parse(baseConfig);

    context.stateManager.update({
      project_id: projectId,
      brief,
      config: parsedConfig,
      phase: "input",
      rendered_clips: {},
    });

    return {
      success: true,
      phase: "input",
      status: "ready",
      next_step: "reel_transcribe_audio",
      blocked_by: [],
      data: {
        project_id: projectId,
        brief,
        config: parsedConfig,
      },
    };
  },
};
