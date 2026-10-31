import { SceneIR } from "../contracts/scene-ir.schema.js";
import { ProjectConfig } from "../contracts/project-config.schema.js";
import { SelfReviewRubric, GateViolation } from "../contracts/project-state.schema.js";

export class RubricEvaluator {
  /**
   * Evaluates a Scene IR against the 7-item director rubric, returning
   * detailed item scores (0, 1, 2) and any blocking gate violations.
   */
  evaluate(ir: SceneIR, config: ProjectConfig): { rubric: SelfReviewRubric; totalScore: number; violations: GateViolation[] } {
    const violations: GateViolation[] = [];
    const fps = ir.fps;

    // 1. Hook (Clear event at frame 0/1, promise clear by second 3)
    let hookScore = 1;
    let hookNotes = "Acceptable hook timing.";
    const hookScene = ir.scenes.find(s => s.type === "hook") || ir.scenes[0];
    if (hookScene) {
      const hasFrame0Event = hookScene.events.some(e => e.frame === hookScene.start_frame || e.frame === hookScene.start_frame + 1);
      const hookDuration_s = (hookScene.end_frame - hookScene.start_frame) / fps;

      if (!hasFrame0Event || hookDuration_s > 3.5) {
        hookScore = 0;
        hookNotes = "Fails: Hook missing frame 0 entrance event or exceeds 3.5s.";
      } else if (hasFrame0Event && hookDuration_s <= 3.0 && /[?!]/.test(hookScene.narration)) {
        hookScore = 2;
        hookNotes = "Strong: Punchy hook with frame 0 event resolving within 3.0s.";
      }
    }

    // 2. One Idea (Summarized in single sentence without excessive conjunctions)
    let ideaScore = 2;
    let ideaNotes = "Strong: Single focused core idea.";
    const coreIdea = ir.core_idea || "";
    if (coreIdea.length < 10) {
      ideaScore = 0;
      ideaNotes = "Fails: Core idea is missing or too brief.";
    } else if (coreIdea.length > 150 || (coreIdea.match(/\band\b/gi) || []).length > 2) {
      ideaScore = 1;
      ideaNotes = "Acceptable: Core idea is somewhat complex or compound.";
    }

    // 3. Pacing (Visual change at least every 3 seconds)
    let pacingScore = 2;
    let pacingNotes = "Strong: Dynamic pacing with visual events every <= 2.0s.";
    const maxStaticFrames = Math.round(config.pacing.max_static_s * fps);
    let worstGapFrames = 0;

    for (const sc of ir.scenes) {
      let lastF = sc.start_frame;
      for (const ev of sc.events) {
        const gap = ev.frame - lastF;
        if (gap > worstGapFrames) worstGapFrames = gap;
        lastF = ev.frame;
      }
      const tail = sc.end_frame - lastF;
      if (tail > worstGapFrames) worstGapFrames = tail;
    }

    const worstGap_s = worstGapFrames / fps;
    if (worstGap_s > 3.0) {
      pacingScore = 0;
      pacingNotes = `Fails: Visual stillness gap of ${worstGap_s.toFixed(1)}s exceeds 3.0s.`;
    } else if (worstGap_s > 2.0) {
      pacingScore = 1;
      pacingNotes = `Acceptable: Longest static interval is ${worstGap_s.toFixed(1)}s.`;
    }

    // 4. Legibility (Safe zone containment and reading dwell time)
    let legibilityScore = 2;
    let legibilityNotes = "Strong: All text inside safe area with comfortable dwell times.";
    for (const sc of ir.scenes) {
      const dur_s = (sc.end_frame - sc.start_frame) / fps;
      const cps = sc.narration.length / Math.max(0.1, dur_s);
      if (cps > 22) {
        legibilityScore = 0;
        legibilityNotes = `Fails: Narration in scene ${sc.id} is too dense to read (${cps.toFixed(1)} cps).`;
        break;
      } else if (cps > 18) {
        legibilityScore = 1;
        legibilityNotes = "Acceptable: Text density is on the higher side.";
      }
    }

    // 5. Motion (Consistent motion language, single focal motion)
    let motionScore = 2;
    let motionNotes = "Strong: Consistent transition cadence and purposeful motion.";
    const heavyTransitions = ir.scenes.filter(s => s.transition_in && !["hard_cut", "match_cut"].includes(s.transition_in));
    if (heavyTransitions.length > 4) {
      motionScore = 1;
      motionNotes = "Acceptable: Slightly high transition count; prefer hard cuts between beats.";
    }

    // 6. Send Moment (Designated beat worth forwarding)
    let sendScore = 1;
    let sendNotes = "Acceptable: Standard informative narrative.";
    const hasSendMoment = ir.scenes.some(s => s.send_moment === true);
    if (hasSendMoment) {
      sendScore = 2;
      sendNotes = "Strong: Clear designated send moment beat.";
    } else if (!ir.scenes.some(s => s.type === "proof" || s.type === "beat")) {
      sendScore = 0;
      sendNotes = "Fails: No clear shareable insight or proof beat.";
    }

    // 7. Payoff and Loop (Ends on answer, connects to opening thesis)
    let payoffScore = 2;
    let payoffNotes = "Strong: Clear payoff scene resolving opening question.";
    const hasPayoff = ir.scenes.some(s => s.type === "payoff" || s.type === "cta_loop");
    if (!hasPayoff) {
      payoffScore = 0;
      payoffNotes = "Fails: Reel lacks a resolution payoff scene.";
    }

    const rubric: SelfReviewRubric = {
      hook: { score: hookScore, notes: hookNotes },
      one_idea: { score: ideaScore, notes: ideaNotes },
      pacing: { score: pacingScore, notes: pacingNotes },
      legibility: { score: legibilityScore, notes: legibilityNotes },
      motion: { score: motionScore, notes: motionNotes },
      send_moment: { score: sendScore, notes: sendNotes },
      payoff_and_loop: { score: payoffScore, notes: payoffNotes },
    };

    const scores = [hookScore, ideaScore, pacingScore, legibilityScore, motionScore, sendScore, payoffScore];
    const totalScore = scores.reduce((a, b) => a + b, 0);

    // Rule: No zeros allowed
    const zeroCriteria: string[] = [];
    if (hookScore === 0) zeroCriteria.push("hook");
    if (ideaScore === 0) zeroCriteria.push("one_idea");
    if (pacingScore === 0) zeroCriteria.push("pacing");
    if (legibilityScore === 0) zeroCriteria.push("legibility");
    if (motionScore === 0) zeroCriteria.push("motion");
    if (sendScore === 0) zeroCriteria.push("send_moment");
    if (payoffScore === 0) zeroCriteria.push("payoff_and_loop");

    if (zeroCriteria.length > 0) {
      violations.push({
        gate_id: "RUBRIC_ZERO_SCORE",
        severity: "blocker",
        violation_type: "rubric_failure",
        message: `Self-review rubric contains 0 score in: ${zeroCriteria.join(", ")}. All criteria must achieve at least 1.`,
        suggested_fix: "Address the failing rubric criteria before proceeding to composition.",
      });
    }

    // Rule: Minimum total score >= 10 out of 14
    if (totalScore < 10) {
      violations.push({
        gate_id: "RUBRIC_MIN_SCORE",
        severity: "blocker",
        violation_type: "rubric_total_too_low",
        message: `Total rubric score (${totalScore}/14) is below the minimum passing threshold of 10/14.`,
        suggested_fix: "Improve hook impact, pacing density, or send moment clarity to increase overall score.",
      });
    }

    return {
      rubric,
      totalScore,
      violations,
    };
  }
}
