import { SceneIR } from "../contracts/scene-ir.schema.js";
import { ProjectConfig } from "../contracts/project-config.schema.js";
import { GateViolation } from "../contracts/project-state.schema.js";
import { ContrastEvaluator } from "./contrast.js";

export class IRLinter {
  /**
   * Performs pre-render static analysis of Scene IR against project configuration.
   */
  lint(ir: SceneIR, config: ProjectConfig): GateViolation[] {
    const violations: GateViolation[] = [];
    const fps = ir.fps;
    const totalDurationSeconds = ir.total_frames / fps;

    // 1. GATE_HOOK_DEADLINE
    const hookScene = ir.scenes.find(s => s.type === "hook") || ir.scenes[0];
    if (hookScene) {
      const hookDeadlineFrames = Math.round(config.pacing.hook_complete_s * fps);
      const hookDurationFrames = hookScene.end_frame - hookScene.start_frame;

      // Event at frame 0 or 1
      const hasEarlyEvent = hookScene.events.some(e => e.frame === hookScene.start_frame || e.frame === hookScene.start_frame + 1);
      if (!hasEarlyEvent) {
        violations.push({
          gate_id: "GATE_HOOK_DEADLINE",
          scene_id: hookScene.id,
          frame_range: [hookScene.start_frame, hookScene.start_frame + 1],
          severity: "blocker",
          violation_type: "missing_frame_1_event",
          message: `Hook scene "${hookScene.id}" does not have an immediate visual or text event at frame 0/1.`,
          suggested_fix: "Add an 'element_in' or 'text_event' at frame 0 of the hook scene.",
        });
      }

      if (hookDurationFrames > hookDeadlineFrames) {
        violations.push({
          gate_id: "GATE_HOOK_DEADLINE",
          scene_id: hookScene.id,
          frame_range: [hookScene.start_frame, hookScene.end_frame],
          severity: "blocker",
          violation_type: "hook_exceeds_deadline",
          message: `Hook duration (${(hookDurationFrames / fps).toFixed(2)}s) exceeds maximum hook deadline (${config.pacing.hook_complete_s}s).`,
          suggested_fix: `Tighten hook scene to complete by frame ${hookDeadlineFrames} (${config.pacing.hook_complete_s}s).`,
        });
      }
    }

    // 2. GATE_VISUAL_PACING
    const maxStaticFrames = Math.round(config.pacing.max_static_s * fps);
    for (const sc of ir.scenes) {
      const sceneDuration = sc.end_frame - sc.start_frame;
      if (sc.events.length === 0 && sceneDuration > maxStaticFrames) {
        violations.push({
          gate_id: "GATE_VISUAL_PACING",
          scene_id: sc.id,
          frame_range: [sc.start_frame, sc.end_frame],
          severity: "blocker",
          violation_type: "no_events_in_long_scene",
          message: `Scene "${sc.id}" has no visual events for ${(sceneDuration / fps).toFixed(2)}s, exceeding max static limit of ${config.pacing.max_static_s}s.`,
          suggested_fix: "Insert visual events (text highlight, camera push, motion change) at least every 2.5s.",
        });
        continue;
      }

      let lastEventFrame = sc.start_frame;
      for (const ev of sc.events) {
        const gap = ev.frame - lastEventFrame;
        if (gap > maxStaticFrames) {
          violations.push({
            gate_id: "GATE_VISUAL_PACING",
            scene_id: sc.id,
            frame_range: [lastEventFrame, ev.frame],
            severity: "blocker",
            violation_type: "static_interval_exceeded",
            message: `Static gap of ${(gap / fps).toFixed(2)}s in scene "${sc.id}" exceeds max static limit of ${config.pacing.max_static_s}s.`,
            suggested_fix: "Add an intermediate visual change to break up the static interval.",
          });
        }
        lastEventFrame = ev.frame;
      }

      const tailGap = sc.end_frame - lastEventFrame;
      if (tailGap > maxStaticFrames) {
        violations.push({
          gate_id: "GATE_VISUAL_PACING",
          scene_id: sc.id,
          frame_range: [lastEventFrame, sc.end_frame],
          severity: "blocker",
          violation_type: "static_interval_exceeded_tail",
          message: `Ending static gap of ${(tailGap / fps).toFixed(2)}s in scene "${sc.id}" exceeds max static limit.`,
          suggested_fix: "Add an ending motion change or text dwell event before scene cut.",
        });
      }
    }

    // 3. GATE_SAFE_ZONE
    // Safe margins on 1080x1920: top 14% (269px), bottom 35% (1248px), side 6% (65px - 1015px)
    const topMarginPx = Math.round(config.format.height * config.format.safe_zone.top);
    const bottomLimitPx = Math.round(config.format.height * (1 - config.format.safe_zone.bottom));
    const sideMarginPx = Math.round(config.format.width * config.format.safe_zone.side);

    for (const sc of ir.scenes) {
      // Check layout strings containing explicit coordinates or out-of-bounds indications
      if (sc.layout.includes("danger_zone") || sc.layout.includes("bottom_nav") || sc.layout.includes("top_header")) {
        violations.push({
          gate_id: "GATE_SAFE_ZONE",
          scene_id: sc.id,
          severity: "blocker",
          violation_type: "safe_zone_breach",
          message: `Scene "${sc.id}" layout "${sc.layout}" places text or interactive elements in mobile danger zone.`,
          suggested_fix: `Confine all text within Y between ${topMarginPx}px and ${bottomLimitPx}px, and X between ${sideMarginPx}px and ${config.format.width - sideMarginPx}px.`,
        });
      }
    }

    // 4. GATE_READING_SPEED
    const maxCps = config.captions.reading_speed_cps ?? 18;
    for (const sc of ir.scenes) {
      const durationSeconds = (sc.end_frame - sc.start_frame) / fps;
      const cleanNarration = sc.narration.trim();
      if (cleanNarration.length > 0) {
        const cps = cleanNarration.length / durationSeconds;
        // Allow 25% tolerance above maxCps before hard blocking
        if (cps > maxCps * 1.25) {
          violations.push({
            gate_id: "GATE_READING_SPEED",
            scene_id: sc.id,
            severity: "blocker",
            violation_type: "reading_speed_too_fast",
            message: `Narration in scene "${sc.id}" requires ${cps.toFixed(1)} chars/sec, exceeding maximum reading speed of ${maxCps} cps.`,
            suggested_fix: `Shorten narration text or extend scene duration to at least ${(cleanNarration.length / maxCps).toFixed(1)}s.`,
          });
        }
      }
    }

    // 5. GATE_CONTRAST_RATIO
    // Check contrast between palette foreground (index 1) and background (index 0)
    const palette = config.style.palette;
    if (palette && palette.length >= 2) {
      const bg = palette[0];
      const fg = palette[1];
      const ratio = ContrastEvaluator.calculateContrastRatio(fg, bg);
      if (ratio < 4.5) {
        violations.push({
          gate_id: "GATE_CONTRAST_RATIO",
          severity: "blocker",
          violation_type: "insufficient_text_contrast",
          message: `Style palette contrast ratio (${ratio}:1 between ${fg} and ${bg}) fails WCAG AA 4.5:1 requirement.`,
          suggested_fix: "Adjust foreground or background color tokens to increase luminance contrast.",
        });
      }
    }

    // 6. GATE_TRANSITION_BUDGET
    // Count heavy transitions vs video duration (max 1 per 10s default)
    const heavyTransitions = ir.scenes.filter(s => s.transition_in && !["hard_cut", "match_cut"].includes(s.transition_in));
    const maxAllowedHeavy = Math.max(1, Math.ceil(totalDurationSeconds / 10) * (config.transitions.max_heavy_per_10s ?? 1));
    if (heavyTransitions.length > maxAllowedHeavy) {
      violations.push({
        gate_id: "GATE_TRANSITION_BUDGET",
        severity: "blocker",
        violation_type: "too_many_heavy_transitions",
        message: `Video has ${heavyTransitions.length} heavy transitions, exceeding maximum budget of ${maxAllowedHeavy} for a ${totalDurationSeconds.toFixed(1)}s reel.`,
        suggested_fix: "Replace intermediate transitions with 'hard_cut' between conceptual beats.",
      });
    }

    return violations;
  }
}
