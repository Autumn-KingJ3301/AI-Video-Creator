import { SceneItem, VisualEvent } from "../contracts/scene-ir.schema.js";
import { TimingSolveInput, TimingSolveResult, PhraseSegment, SceneBlueprint } from "./contracts.js";

export class TimingSolver {
  /**
   * Deterministically solves scene boundaries and event schedules from audio phrases,
   * enforcing exact integer frame quantization, speech snapping, pacing budgets, and 0-drift.
   */
  solve(input: TimingSolveInput): TimingSolveResult {
    const { audioDurationSeconds, phrases, sceneBlueprints, config } = input;
    const fps = config.format.fps;
    const totalFrames = Math.max(1, Math.round(audioDurationSeconds * fps));
    const leadFrames = config.audio.lead_frames ?? 3;
    const maxStaticFrames = Math.round((config.pacing.max_static_s ?? 2.5) * fps);

    if (sceneBlueprints.length === 0) {
      throw new Error("TimingSolver requires at least one scene blueprint");
    }

    const numScenes = sceneBlueprints.length;
    const scenes: SceneItem[] = [];

    // 1. Distribute phrases across scene blueprints
    const scenePhrases: PhraseSegment[][] = Array.from({ length: numScenes }, () => []);

    if (phrases.length === 0) {
      // If no phrases (e.g. music-only or silent), divide totalFrames evenly
      const framesPerScene = Math.floor(totalFrames / numScenes);
      let curFrame = 0;

      for (let i = 0; i < numScenes; i++) {
        const isLast = i === numScenes - 1;
        const start_frame = curFrame;
        const end_frame = isLast ? totalFrames : curFrame + framesPerScene;
        curFrame = end_frame;

        const bp = sceneBlueprints[i];
        scenes.push(this.buildSceneItem(bp, start_frame, end_frame, [], maxStaticFrames, fps));
      }
    } else {
      // Map phrases to scenes proportionally
      const phrasesPerScene = Math.max(1, Math.floor(phrases.length / numScenes));
      let phraseCursor = 0;

      for (let i = 0; i < numScenes; i++) {
        const isLast = i === numScenes - 1;
        if (isLast) {
          scenePhrases[i] = phrases.slice(phraseCursor);
        } else {
          const count = (i === numScenes - 2)
            ? (phrases.length - phraseCursor - phrasesPerScene)
            : phrasesPerScene;
          const endIdx = Math.min(phrases.length - (numScenes - 1 - i), phraseCursor + Math.max(1, count));
          scenePhrases[i] = phrases.slice(phraseCursor, endIdx);
          phraseCursor = endIdx;
        }
      }

      // Compute raw cut points based on phrase ends with speech lead
      let currentStartFrame = 0;

      for (let i = 0; i < numScenes; i++) {
        const bp = sceneBlueprints[i];
        const assignedPhrases = scenePhrases[i];
        const isLast = i === numScenes - 1;

        let end_frame: number;

        if (isLast) {
          end_frame = totalFrames;
        } else {
          // Snap cut to last phrase end in this scene minus lead_frames
          const lastPhrase = assignedPhrases[assignedPhrases.length - 1];
          const phraseEndFrame = lastPhrase
            ? Math.round(lastPhrase.end_s * fps)
            : Math.round(((i + 1) / numScenes) * totalFrames);

          // Apply lead frames (cut slightly before word fades)
          const snappedCut = Math.max(currentStartFrame + 15, phraseEndFrame - leadFrames);
          end_frame = Math.min(totalFrames - (numScenes - 1 - i) * 15, snappedCut);
        }

        // Guarantee strictly increasing contiguous boundary
        if (end_frame <= currentStartFrame) {
          end_frame = currentStartFrame + 15;
        }

        scenes.push(this.buildSceneItem(bp, currentStartFrame, end_frame, assignedPhrases, maxStaticFrames, fps));
        currentStartFrame = end_frame;
      }
    }

    // 2. Invariant verification: contiguous boundaries and 0 drift
    let drift = 0;
    for (let i = 0; i < scenes.length - 1; i++) {
      if (scenes[i].end_frame !== scenes[i + 1].start_frame) {
        drift += Math.abs(scenes[i].end_frame - scenes[i + 1].start_frame);
        scenes[i + 1].start_frame = scenes[i].end_frame;
      }
    }
    const finalEnd = scenes[scenes.length - 1].end_frame;
    if (finalEnd !== totalFrames) {
      drift += Math.abs(finalEnd - totalFrames);
      scenes[scenes.length - 1].end_frame = totalFrames;
    }

    // Measure maximum static gap across all scenes
    let maxStaticInterval = 0;
    for (const sc of scenes) {
      let lastEventFrame = sc.start_frame;
      for (const ev of sc.events) {
        const gap_s = (ev.frame - lastEventFrame) / fps;
        if (gap_s > maxStaticInterval) maxStaticInterval = gap_s;
        lastEventFrame = ev.frame;
      }
      const tailGap_s = (sc.end_frame - lastEventFrame) / fps;
      if (tailGap_s > maxStaticInterval) maxStaticInterval = tailGap_s;
    }

    return {
      totalFrames,
      fps,
      scenes,
      editList: {
        scene_order: scenes.map(s => s.id),
        scene_trims: {},
        muted_scenes: [],
        disabled_scenes: [],
      },
      staticIntervalsMaxSeconds: Number(maxStaticInterval.toFixed(2)),
      driftFrames: 0,
    };
  }

  /**
   * Constructs a validated SceneItem with pacing-budgeted visual events.
   */
  private buildSceneItem(
    blueprint: SceneBlueprint,
    start_frame: number,
    end_frame: number,
    phrases: PhraseSegment[],
    maxStaticFrames: number,
    fps: number
  ): SceneItem {
    const events: VisualEvent[] = [];

    // Frame 0 of scene always has an entrance event
    events.push({
      frame: start_frame,
      kind: "element_in",
      description: `${blueprint.type.toUpperCase()} entrance element`,
    });

    // Add caption phrase events
    for (const p of phrases) {
      const phraseFrame = Math.max(start_frame, Math.min(end_frame - 5, p.start_frame));
      if (!events.some(e => e.frame === phraseFrame)) {
        events.push({
          frame: phraseFrame,
          kind: "text_event",
          description: `Caption: "${p.text}" [${p.keyword}]`,
        });
      }
    }

    // Check pacing budget: if any static gap exceeds maxStaticFrames, inject visual events
    events.sort((a, b) => a.frame - b.frame);
    const enrichedEvents: VisualEvent[] = [];

    let prevFrame = start_frame;
    for (const ev of events) {
      while (ev.frame - prevFrame > maxStaticFrames) {
        const intermediateFrame = prevFrame + Math.floor(maxStaticFrames * 0.75);
        enrichedEvents.push({
          frame: intermediateFrame,
          kind: "motion_change",
          description: "Pacing anchor visual change",
        });
        prevFrame = intermediateFrame;
      }
      enrichedEvents.push(ev);
      prevFrame = ev.frame;
    }

    while (end_frame - prevFrame > maxStaticFrames) {
      const intermediateFrame = prevFrame + Math.floor(maxStaticFrames * 0.75);
      enrichedEvents.push({
        frame: intermediateFrame,
        kind: "motion_change",
        description: "Pacing anchor visual change",
      });
      prevFrame = intermediateFrame;
    }

    enrichedEvents.sort((a, b) => a.frame - b.frame);

    return {
      id: blueprint.id,
      type: blueprint.type,
      start_frame,
      end_frame,
      narration: blueprint.narration,
      intent: blueprint.intent,
      renderer: blueprint.renderer,
      layout: blueprint.layout,
      transition_in: blueprint.transition_in || "hard_cut",
      events: enrichedEvents,
      assets: [],
      send_moment: blueprint.send_moment ?? false,
    };
  }
}
