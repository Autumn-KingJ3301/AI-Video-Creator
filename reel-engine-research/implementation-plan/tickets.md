# Reel Engine Work Breakdown Structure (Executable Tickets)

This document breaks down the entire implementation roadmap into individually executable, rigorously specified engineering tickets.

---

## 1. Ticket Overview & MVP Boundary

- **MVP Boundary (Must Ship for v0.1):** Tickets `TCK-A01` through `TCK-F04` (Phases A through F) plus essential UI tickets `TCK-G01` to `TCK-G03`. Delivers full end-to-end agent-driven video creation, dual Remotion/Manim rendering, audio master clock, deterministic blocking gates, and local web review.
- **v1 Enhancements:** Advanced non-destructive edit controls (`TCK-G04`), automated vision review (`TCK-D05`), and hardware encoder tuning (`TCK-H02`).
- **Future Scope (v2+):** Social platform API publishing, live analytics ingestion, and multi-language non-Latin font shaping.

---

## 2. Detailed Ticket Catalog

### Phase A: Contracts & Minimal Vertical Slice

#### `TCK-A01`: ProjectConfig and Preset Schema Implementation
- **Requirement IDs:** `REQ-CFG-01`, `REQ-CFG-02`, `REQ-CFG-03`, `REQ-CFG-04`
- **Owner Role:** Senior Backend / Systems Engineer
- **Dependencies:** None
- **Tasks:**
  1. Author Zod schemas for all 8 preset layers: Format, Duration, Pacing, Style, Captions, Transitions, Audio, Export.
  2. Implement default format preset `reel_9x16` (1080x1920, 30fps, top 14%, bottom 35%, side 6%, 3:4 crop).
  3. Bundle 4 starter preset JSON files: Quick Tip (15s), Explainer (30s), Story (45s), Concept Animation (30-45s).
- **Files / Contracts:** `src/schemas/project-config.schema.ts`, `presets/*.json`.
- **Tests:** `tests/unit/project-config.test.ts` (Validates schema defaults, partial overrides, and invalid inputs).
- **Acceptance Criteria:** Valid preset JSONs parse without error; invalid dimensions or missing layers throw typed Zod errors.
- **Estimate:** 2 days (Optimistic: 1.5d, Likely: 2d, Pessimistic: 3d).
- **Risk:** Low.

#### `TCK-A02`: Scene IR Schema and Hand-Authored Vertical Slice
- **Requirement IDs:** `REQ-001`, `REQ-SIR-01`, `REQ-SIR-02`, `REQ-TIM-01`, `REQ-CMP-01`
- **Owner Role:** Video Systems Engineer
- **Dependencies:** `TCK-A01`
- **Tasks:**
  1. Define Scene IR Zod schema matching Section 5.2 (id, type, start_frame, end_frame, narration, renderer, layout, events).
  2. Create golden test fixture: 15-second narrated reel (`fixtures/quick-tip-15s/`).
  3. Implement minimal execution script `src/engine/vertical-slice.ts` that compiles Remotion scenes and invokes FFmpeg concat.
- **Files / Contracts:** `src/schemas/scene-ir.schema.ts`, `src/engine/vertical-slice.ts`, `fixtures/quick-tip-15s/`.
- **Tests:** `tests/integration/vertical-slice.test.ts`.
- **Acceptance Criteria:** Generates playable `out/quick-tip-15s.mp4`, exactly 450 frames long (verified via ffprobe), with audio and visuals in sync.
- **Estimate:** 3 days (Optimistic: 2d, Likely: 3d, Pessimistic: 4d).
- **Risk:** Medium (FFmpeg subprocess handling).

---

### Phase B: Shared Rendering Foundation

#### `TCK-B01`: AST Python Code Sandbox for Manim
- **Requirement IDs:** `REQ-SEC-01`, `REQ-SEC-02`
- **Owner Role:** Security / Python Engineer
- **Dependencies:** None
- **Tasks:**
  1. Vendor-adapt `manim-mcp/manim_mcp/core/sandbox.py:CodeSandbox` into `packages/reel-manim-worker/sandbox.py`.
  2. Enforce blocked modules (26 sys/os/subprocess modules), blocked builtins, and dunder traversal guards.
  3. Wire AST validation before any Python execution.
- **Files / Contracts:** `packages/reel-manim-worker/sandbox.py`.
- **Tests:** `tests/security/sandbox.test.py` (Port `manim-mcp/tests/test_sandbox.py`).
- **Acceptance Criteria:** Malicious Python code (e.g. `import os; os.system(...)` or `().__class__.__bases__`) is 100% blocked with descriptive AST error.
- **Estimate:** 2 days (Optimistic: 1d, Likely: 2d, Pessimistic: 3d).
- **Risk:** Low.

#### `TCK-B02`: Dual-Renderer Adapter and Shared Helper Libraries
- **Requirement IDs:** `REQ-REN-01`, `REQ-REN-02`, `REQ-REN-03`, `REQ-REN-04`, `REQ-TRN-03`
- **Owner Role:** Full-Stack Video Engineer
- **Dependencies:** `TCK-A02`, `TCK-B01`
- **Tasks:**
  1. Implement `RemotionAdapter` and `ManimAdapter` adhering to `SceneRendererAdapter` interface.
  2. Create `packages/reel-remotion-helpers/` exposing `Layout`, `SafeZone`, and style tokens.
  3. Create `packages/reel_manim_helpers/` exposing `ReelScene` with 9:16 vertical camera framing.
  4. Implement entrance ease-out curves (6–12 frames).
- **Files / Contracts:** `src/renderers/remotion.adapter.ts`, `src/renderers/manim.adapter.ts`, helper packages.
- **Tests:** `tests/renderers/dual-renderer.test.ts`.
- **Acceptance Criteria:** Renders a test reel with 1 Remotion scene and 1 Manim scene; both conform to 1080x1920 @ 30fps with matching palettes and safe margins.
- **Estimate:** 4 days (Optimistic: 3d, Likely: 4d, Pessimistic: 6d).
- **Risk:** Medium (Manim Python subprocess communication).

---

### Phase C: Audio-Driven Frame Timing

#### `TCK-C01`: Whisper Transcription and Phrase-End Snapping Solver
- **Requirement IDs:** `REQ-TIM-01`, `REQ-TIM-02`, `REQ-TIM-03`, `REQ-TIM-04`
- **Owner Role:** Audio / Algorithm Engineer
- **Dependencies:** `TCK-A02`
- **Tasks:**
  1. Implement Whisper runner extracting word timestamps (seconds + integer frame conversion).
  2. Implement pause tightener using FFmpeg `silencedetect` to remove pauses > 0.35s.
  3. Implement phrase snapper clustering words and snapping scene bounds to phrase ends with 2-frame lead.
  4. Enforce invariant: `sum(scene_frames) == total_audio_frames`.
- **Files / Contracts:** `src/timing/whisper.ts`, `src/timing/pause-tightener.ts`, `src/timing/timeline-solver.ts`.
- **Tests:** `tests/unit/timeline-solver.test.ts`.
- **Acceptance Criteria:** Integer-frame scene bounds generated with 0 frames cumulative drift across multi-minute audio.
- **Estimate:** 4 days (Optimistic: 3d, Likely: 4d, Pessimistic: 5d).
- **Risk:** Medium (Speech boundary variance).

---

### Phase D: Deterministic Quality Gates

#### `TCK-D01`: Safe Area, Reading Dwell Time, and Loudness Gates
- **Requirement IDs:** `REQ-DOC-04`, `REQ-TYP-02`, `REQ-QA-01`, `REQ-QA-02`, `REQ-QA-05`, `REQ-QA-06`
- **Owner Role:** QA / Video Systems Engineer
- **Dependencies:** `TCK-B02`, `TCK-C01`
- **Tasks:**
  1. Vendor-adapt `mimic-mcp/src/safe-area.ts` and `mimic-mcp/src/loudness.ts`.
  2. Implement reading dwell time gate: `dwell_frames >= (chars / 18.0) * fps`.
  3. Implement duration match gate: `actual_frames == planned_frames` via ffprobe.
  4. Implement `Gatekeeper` service orchestrating checks and blocking compilation on failure.
- **Files / Contracts:** `src/qa/gatekeeper.ts`, `src/qa/safe-area.gate.ts`, `src/qa/loudness.gate.ts`, `src/qa/reading-speed.gate.ts`.
- **Tests:** `tests/qa/blocking-gates.test.ts`.
- **Acceptance Criteria:** Negative fixtures (occluded text, fast text, loud audio, frame count mismatch) are 100% blocked with structured errors.
- **Estimate:** 4 days (Optimistic: 3d, Likely: 4d, Pessimistic: 5d).
- **Risk:** Low.

#### `TCK-D02`: Frame Contrast and Static Window Detection Gates
- **Requirement IDs:** `REQ-DOC-03`, `REQ-TYP-03`, `REQ-QA-03`, `REQ-QA-04`, `REQ-QA-07`
- **Owner Role:** Computer Vision / QA Engineer
- **Dependencies:** `TCK-D01`
- **Tasks:**
  1. Vendor-adapt `mimic-mcp/src/frame-quality.ts` for grayscale contrast and exposure statistics.
  2. Implement sliding-window frame difference detector using FFmpeg `mpdecimate` or pixel buffer subtraction.
  3. Implement transition budget checker (`count(heavy) / (duration/10) <= max_heavy`).
- **Files / Contracts:** `src/qa/frame-contrast.gate.ts`, `src/qa/static-limit.gate.ts`, `src/qa/transition-budget.gate.ts`.
- **Tests:** `tests/qa/static-and-contrast.test.ts`.
- **Acceptance Criteria:** Static video scenes (> 2.5s without pixel variance) and washed-out text crops are blocked.
- **Estimate:** 3 days (Optimistic: 2d, Likely: 3d, Pessimistic: 4d).
- **Risk:** Medium (Threshold tuning).

---

### Phase E: Composition, Caching & Recovery

#### `TCK-E01`: FFmpeg Final Composition and Non-Destructive Edit List
- **Requirement IDs:** `REQ-CMP-01`, `REQ-CMP-03`, `REQ-CMP-04`
- **Owner Role:** Video Systems Engineer
- **Dependencies:** `TCK-D02`
- **Tasks:**
  1. Build FFmpeg filtergraph composer concatenating clips, burning styled ASS subtitles, and mixing audio.
  2. Implement dynamic audio ducking (music ducks -12dB under voiceover).
  3. Implement non-destructive edit list applier (trims, reorders, scene mutes in concat script).
- **Files / Contracts:** `src/composer/ffmpeg.composer.ts`, `src/composer/edit-list.ts`.
- **Tests:** `tests/composer/composition.test.ts`.
- **Acceptance Criteria:** Export produces pristine MP4 with burned subtitles and normalized -14 LUFS audio without re-rendering clips.
- **Estimate:** 3 days (Optimistic: 2d, Likely: 3d, Pessimistic: 4d).
- **Risk:** Medium.

#### `TCK-E02`: Multi-Tier Content-Addressed Scene Caching
- **Requirement IDs:** `REQ-CMP-02`
- **Owner Role:** Backend Engineer
- **Dependencies:** `TCK-E01`
- **Tasks:**
  1. Implement cache key hashing: `sha256(scene_ir + code_bytes + style_tokens + audio_slice + renderer_version)`.
  2. Store clips in `.cache/clips/<hash>.mp4`.
  3. Wire cache lookup into scene render adapters.
- **Files / Contracts:** `src/composer/cache.manager.ts`.
- **Tests:** `tests/composer/cache.test.ts`.
- **Acceptance Criteria:** Re-rendering an unmodified scene returns cache hit in < 50ms; editing one scene invalidates only that scene.
- **Estimate:** 2 days (Optimistic: 1.5d, Likely: 2d, Pessimistic: 3d).
- **Risk:** Low.

---

### Phase F: MCP Protocol State Machine & Director Skill

#### `TCK-F01`: FSM State Machine and Core 13 MCP Tools
- **Requirement IDs:** `REQ-005`, `REQ-MCP-01`, `REQ-MCP-02`, `REQ-MCP-03`, `REQ-MCP-04`, `REQ-MCP-05`
- **Owner Role:** MCP / Full-Stack Engineer
- **Dependencies:** `TCK-E02`
- **Tasks:**
  1. Implement Finite State Machine (`input` -> `transcribed` -> `planned` -> `authored` -> `rendered` -> `verified` -> `composed` -> `exported`).
  2. Expose all 13 MCP tools with unified response envelopes (`phase`, `status`, `next_step`, `blocked_by`).
  3. Implement `get_next_step()` recovery tool and `submit_review(rubric)` gate.
- **Files / Contracts:** `src/mcp/state-machine.ts`, `src/mcp/tools/*.ts`, `src/server.ts`.
- **Tests:** `tests/mcp/state-machine.test.ts`.
- **Acceptance Criteria:** Out-of-order calls rejected; agent can recover state after context clear via `get_next_step()`.
- **Estimate:** 4 days (Optimistic: 3d, Likely: 4d, Pessimistic: 5d).
- **Risk:** Low.

#### `TCK-F02`: Director Skill Authoring
- **Requirement IDs:** `REQ-DOC-01` through `REQ-DOC-07`
- **Owner Role:** Prompt / AI Systems Engineer
- **Dependencies:** `TCK-F01`
- **Tasks:**
  1. Package Director Doctrine v0.1 into `skills/reel-director/SKILL.md`.
  2. Include catalog of scene types, transitions, layouts, and worked examples.
  3. Author self-review rubric guidelines and anti-pattern catalogue.
- **Files / Contracts:** `skills/reel-director/SKILL.md`, `skills/reel-director/examples/`.
- **Tests:** Manual agent execution test with simulated director prompt.
- **Acceptance Criteria:** Agent follows 1-idea rule, writes 3 hook candidates, scores them, and submits valid Scene IR.
- **Estimate:** 2 days (Optimistic: 1.5d, Likely: 2d, Pessimistic: 3d).
- **Risk:** Low.

---

### Phase G: Local React Web UI

#### `TCK-G01`: Web Control Panel, Phase View & Scene Timeline
- **Requirement IDs:** `REQ-UI-01`, `REQ-UI-02`, `REQ-UI-03`, `REQ-UI-04`
- **Owner Role:** Frontend / UI Engineer
- **Dependencies:** `TCK-F01`
- **Tasks:**
  1. Adapt `short-video-maker/src/ui/` React/Vite/Tailwind structure.
  2. Build PhaseTracker, SceneTimeline, VideoPlayer, and PromptPanel components.
  3. Connect UI to `/api/project` state via Server-Sent Events (SSE).
- **Files / Contracts:** `ui/src/App.tsx`, `ui/src/components/*`.
- **Tests:** `tests/ui/ui-render.test.tsx`.
- **Acceptance Criteria:** User can inspect project progress, view rendered clips, and copy agent prompt in browser.
- **Estimate:** 4 days (Optimistic: 3d, Likely: 4d, Pessimistic: 5d).
- **Risk:** Low.
