# ADR-007: QA Enforcement and Advisory Review Separation

- **Status:** Accepted
- **Date:** 2026-10-30
- **Context:** Many AI tools blur the line between deterministic invariants (safe zone bounds, frame counts) and subjective aesthetic opinions (visual appeal, clutter). In OpenChatCut, this resulted in quality checks being marked purely advisory with zero blocking enforcement.
- **Decision:**
  1. The Reel Engine strictly separates quality checks into two categories:
     - **Deterministic Blocking Gates (Hard Gates):** Render completion (exit code 0), exact frame count match, hook event timing, static interval limits, safe zone & 3:4 crop containment, audio loudness (-14 LUFS), transition budgets, and rubric scores >= 1. **Any failure completely blocks transition to `composed`**.
     - **Advisory Model Checks (Soft Gates):** Vision-model evaluations of visual clutter, scene aesthetics, and qualitative feedback. These findings are surfaced as recommendations to the agent and human user, but **never block compilation**.
  2. The gatekeeper evaluates deterministic gates automatically before allowing `compose()`.
- **Consequences:**
  - *Positive:* Guarantees that no technically defective video (occluded text, out-of-sync audio, clipped loudness) can ever be exported.
  - *Positive:* Prevents flaky or non-deterministic vision model responses from randomly halting the pipeline.
  - *Trade-off:* Requires comprehensive automated unit tests for every deterministic gate.
- **Evidence:** Follows `Reel Engine Design Document v0.1 §11` and resolves the OpenChatCut advisory flaw (`src/agent/sceneQuality.ts:1`).
