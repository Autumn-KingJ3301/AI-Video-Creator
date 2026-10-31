import { z } from "zod";

export const SceneTypeEnum = z.enum([
  "hook",      // Stop scroll, promise payoff (1.5-3s)
  "setup",     // Context (skip if hook did it)
  "beat",      // Core piece of idea (3-6s)
  "proof",     // Visual demonstration/data
  "reset",     // Pattern interrupt before attention drifts (1-2s)
  "payoff",    // Resolution / takeaway
  "cta_loop",  // Loop back or single call to action
]);

export const EventKindEnum = z.enum([
  "element_in",     // New graphical element entrance
  "text_event",     // Caption keyword, subtitle line, or title pop
  "motion_change",  // Camera zoom, pan, speed ramp, or transform
  "cut",            // Hard cut or transition boundary
]);

export const VisualEventSchema = z.object({
  frame: z.number().int().nonnegative(),
  kind: EventKindEnum,
  description: z.string().optional(),
  text: z.string().optional(),
  color: z.string().optional(),
  style: z.string().optional(),
  y_px: z.number().optional(),
  element: z.string().optional(),
  note: z.string().optional(),
}).passthrough();

export const SceneItemSchema = z.object({
  id: z.string().regex(/^s\d{2,}$/, "Scene ID must follow 's01', 's02' format"),
  type: SceneTypeEnum,
  start_frame: z.number().int().nonnegative(),
  end_frame: z.number().int().positive(),
  narration: z.string(),
  intent: z.string(),
  renderer: z.enum(["remotion", "manim"]),
  layout: z.string(),
  transition_in: z.string().default("hard_cut"),
  events: z.array(VisualEventSchema).default([]),
  assets: z.array(z.string()).default([]),
  send_moment: z.boolean().default(false),
}).refine(data => data.end_frame > data.start_frame, {
  message: "end_frame must be strictly greater than start_frame",
  path: ["end_frame"],
});

export const EditListSchema = z.object({
  scene_order: z.array(z.string()).optional(),
  scene_trims: z.record(z.object({
    trim_in_frames: z.number().int().nonnegative().default(0),
    trim_out_frames: z.number().int().nonnegative().default(0),
  })).default({}),
  muted_scenes: z.array(z.string()).default([]),
  disabled_scenes: z.array(z.string()).default([]),
});

export const SceneIRSchema = z.object({
  $schema: z.string().default("https://reel-engine.dev/schemas/v0.1/scene-ir.json"),
  core_idea: z.string().min(5, "Core idea must be specified in a single clear sentence"),
  total_frames: z.number().int().positive(),
  fps: z.number().int().positive().default(30),
  scenes: z.array(SceneItemSchema).min(1, "Video must contain at least one scene"),
  edit_list: EditListSchema.default({}),
}).refine(data => {
  // Validate that scenes are strictly ordered in time and do not overlap
  for (let i = 0; i < data.scenes.length - 1; i++) {
    const current = data.scenes[i];
    const next = data.scenes[i + 1];
    if (current.end_frame !== next.start_frame) {
      return false;
    }
  }
  return true;
}, {
  message: "Scene boundaries must be contiguous without gaps or overlaps",
  path: ["scenes"],
});

export type SceneType = z.infer<typeof SceneTypeEnum>;
export type EventKind = z.infer<typeof EventKindEnum>;
export type VisualEvent = z.infer<typeof VisualEventSchema>;
export type SceneItem = z.infer<typeof SceneItemSchema>;
export type EditList = z.infer<typeof EditListSchema>;
export type SceneIR = z.infer<typeof SceneIRSchema>;
