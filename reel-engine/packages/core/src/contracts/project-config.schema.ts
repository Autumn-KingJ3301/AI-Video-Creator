import { z } from "zod";

/**
 * Mobile platform safe zone margins.
 * On 1080x1920, top 0.14 = 269px, bottom 0.35 = 672px, side 0.06 = 65px.
 */
export const SafeZoneSchema = z.object({
  top: z.number().min(0).max(0.5).default(0.14),
  bottom: z.number().min(0).max(0.5).default(0.35),
  side: z.number().min(0).max(0.2).default(0.06),
});

export const FormatConfigSchema = z.object({
  preset: z.string().default("reel_9x16"),
  width: z.number().int().positive().default(1080),
  height: z.number().int().positive().default(1920),
  fps: z.number().int().positive().default(30),
  safe_zone: SafeZoneSchema.default({ top: 0.14, bottom: 0.35, side: 0.06 }),
  center_crop_check: z.enum(["3:4", "4:5", "none"]).default("3:4"),
});

export const DurationConfigSchema = z.object({
  target_s: z.number().positive().default(30),
  min_s: z.number().positive().default(15),
  max_s: z.number().positive().default(45),
});

export const PacingConfigSchema = z.object({
  preset: z.enum(["punchy", "balanced", "calm"]).default("punchy"),
  hook_deadline_s: z.number().positive().default(1.0),
  hook_complete_s: z.number().positive().default(3.0),
  change_interval_s: z.tuple([z.number().positive(), z.number().positive()]).default([1.5, 3.0]),
  max_static_s: z.number().positive().default(2.5),
});

export const StyleConfigSchema = z.object({
  preset: z.string().default("clean_dark"),
  palette: z.array(z.string()).default(["#0B0F1A", "#F5F7FA", "#4DA3FF", "#FFC857"]),
  fonts: z.object({
    display: z.string().default("Inter"),
    body: z.string().default("Inter"),
  }).default({ display: "Inter", body: "Inter" }),
  motion: z.enum(["snappy", "smooth", "calm"]).default("snappy"),
});

export const CaptionsConfigSchema = z.object({
  mode: z.enum(["phrase", "word", "minimal"]).default("phrase"),
  max_words: z.number().int().positive().default(7),
  position: z.enum(["upper_mid", "center", "lower_mid"]).default("upper_mid"),
  highlight: z.enum(["keyword", "karaoke", "none"]).default("keyword"),
  reading_speed_cps: z.number().positive().default(18), // Characters per second dwell
});

export const TransitionsConfigSchema = z.object({
  allowed: z.array(z.string()).default(["hard_cut", "zoom_punch", "swipe", "mask_reveal", "match_cut"]),
  max_heavy_per_10s: z.number().min(0).default(1),
});

export const AudioConfigSchema = z.object({
  input_source: z.enum(["pre_recorded", "tts_script", "both"]).default("both"),
  loudness_lufs: z.number().default(-14),
  duck_music_db: z.number().default(-12),
  tighten_pauses_s: z.number().default(0.35),
  lead_frames: z.number().int().default(3), // Cut lead before speech fades
  voice_id: z.string().default("af_heart"),
});

export const ExportConfigSchema = z.object({
  draft: z.string().default("540x960@24"),
  final: z.string().default("1080x1920@30"),
  codec: z.enum(["h264", "h265"]).default("h264"),
  encoder: z.enum(["h264_nvenc", "h264_videotoolbox", "h264_qsv", "libx264"]).default("h264_nvenc"),
  hardware_acceleration: z.boolean().default(true),
  container: z.literal("mp4").default("mp4"),
});

export const ProjectConfigSchema = z.object({
  format: FormatConfigSchema.default({}),
  duration: DurationConfigSchema.default({}),
  pacing: PacingConfigSchema.default({}),
  style: StyleConfigSchema.default({}),
  captions: CaptionsConfigSchema.default({}),
  transitions: TransitionsConfigSchema.default({}),
  audio: AudioConfigSchema.default({}),
  export: ExportConfigSchema.default({}),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type SafeZoneConfig = z.infer<typeof SafeZoneSchema>;
export type FormatConfig = z.infer<typeof FormatConfigSchema>;
export type PacingConfig = z.infer<typeof PacingConfigSchema>;
export type StyleConfig = z.infer<typeof StyleConfigSchema>;
export type CaptionsConfig = z.infer<typeof CaptionsConfigSchema>;
export type TransitionsConfig = z.infer<typeof TransitionsConfigSchema>;
export type AudioConfig = z.infer<typeof AudioConfigSchema>;
export type ExportConfig = z.infer<typeof ExportConfigSchema>;
