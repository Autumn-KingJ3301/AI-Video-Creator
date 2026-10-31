# Reel Engine Phased Implementation Roadmap

This roadmap defines the concrete, step-by-step engineering plan to build the Reel Engine without writing product code prematurely. Each phase defines measurable outcomes, requirement coverage, reusable modules, specific tests, and exact exit criteria.

---

## Dependency Graph & Critical Path

```
Build Phase A: Contracts & Minimal Vertical Slice (15s hand-authored reel)
      │
      ▼
Build Phase B: Shared Rendering Foundation (Remotion & Manim Adapters)
      │
      ▼
Build Phase C: Audio-Driven Frame Timing (Whisper, Phrase Snap, Master Clock)
      │
      ▼
Build Phase D: Deterministic Quality Gates (Safe Area, Contrast, -14 LUFS, CPS)
      │
      ▼
Build Phase E: Composition, Caching & Recovery (FFmpeg Concat, Hash Cache)
      │
      ▼
Build Phase F: MCP Protocol & Director Skill (FSM State Machine, 13 Tools)
      │
      ▼
Build Phase G: React Local UI (Control Panel, Timeline, Prompt Panel)
      │
      ▼
Build Phase H: Hardening, Benchmarking & Preset Tuning
```

**Critical Path:** Phase A → Phase B → Phase C → Phase D → Phase E → Phase F.
Phases G (UI) and H (Hardening) can proceed in parallel once Phase E and F interfaces are stable.

---

## Build Phase A — Contracts and Minimal Vertical Slice
- **Goal & User-Visible Outcome:** Prove that the project configuration, Scene IR, Remotion renderer, audio mix, and export work end-to-end on a hand-authored 15-second narrated reel without an AI agent.
- **Requirements Covered:** `REQ-001`, `REQ-CFG-01`, `REQ-CFG-02`, `REQ-SIR-01`, `REQ-SIR-02`, `REQ-TIM-01`, `REQ-CMP-01`.
- **Code to Reuse/Adapt:**
  - `mimic-mcp/src/presets.ts`: Base Zod schema for segment timing and styling.
  - `short-video-maker/src/components/videos/`: Basic Remotion root structure.
- **New Modules to Develop:**
  - `src/schemas/project-config.schema.ts`: Zod validation for format, pacing, style, and audio presets.
  - `src/schemas/scene-ir.schema.ts`: Zod schema for Scene IR JSON matching Section 5.2.
  - `src/engine/vertical-slice.ts`: Script that loads hand-authored IR, renders clips, and calls FFmpeg concat.
- **Golden Fixture & Sample:** `fixtures/quick-tip-15s/` containing `voiceover.mp3` (15.0s, 450 frames @ 30fps), `scene-ir.json` (Hook 0–60, Beat 1 60–210, Beat 2 210–360, Payoff 360–450), and TSX scene components.
- **Automated Acceptance Gate:** Output `out/quick-tip-15s.mp4` is generated, playable, exactly 450 frames long (verified via ffprobe), and matches audio duration within 0 frames.
- **Estimate:** 3–5 engineering days.
- **Exit Artifact:** Playable 15-second MP4 video file and verified JSON test manifest.
- **Restart Note:** Run `npm run test:vertical-slice` to verify the pipeline baseline.

---

## Build Phase B — Shared Rendering Foundation
- **Goal & User-Visible Outcome:** Establish the dual-renderer adapter contract, allowing Remotion and Manim scenes to be mixed in a single video with unified colors, fonts, margins, and 9:16 safe coordinates.
- **Requirements Covered:** `REQ-REN-01`, `REQ-REN-02`, `REQ-REN-03`, `REQ-REN-04`, `REQ-TRN-01`, `REQ-TRN-03`, `REQ-SEC-01`.
- **Code to Reuse/Adapt:**
  - `manim-mcp/manim_mcp/core/sandbox.py`: Direct copy of AST Code Sandbox.
  - `manim-mcp/manim_mcp/core/renderer.py`: Python rendering worker script.
  - `OpenChatCut/remotion/render-contract.mjs`: Headless Remotion snapshot renderer pattern.
- **New Modules to Develop:**
  - `packages/reel-remotion-helpers/`: React components (`Layout`, `SafeZone`, `CaptionBox`, `TitleCard`) exposing standardized layout tokens.
  - `packages/reel_manim_helpers/`: Python module exposing `ReelScene` base class with 9:16 vertical camera setup (`frame_width=9`, `frame_height=16`) and identical color hex constants.
  - `src/renderers/remotion.adapter.ts`: Compiles TSX scene files to headless clips.
  - `src/renderers/manim.adapter.ts`: Validates Python AST and executes Manim worker.
- **Automated Acceptance Gate:** A hybrid 30-second reel containing two Remotion scenes and two Manim scenes renders with zero visual coordinate mismatch and matching background palettes.
- **Estimate:** 5–8 engineering days.
- **Exit Artifact:** Mixed Manim + Remotion demo reel rendered from unified tokens.

---

## Build Phase C — Audio-Driven Frame Timing
- **Goal & User-Visible Outcome:** Audio acts as the authoritative master clock. Voiceover audio is transcribed into word-level timestamps, silences are tightened, and scene cuts snap to speech phrase ends without lip-sync drift.
- **Requirements Covered:** `REQ-TIM-01`, `REQ-TIM-02`, `REQ-TIM-03`, `REQ-TIM-04`, `REQ-DOC-02`.
- **Code to Reuse/Adapt:**
  - `OpenMontage/lib/verify_scene_pacing.py`: Frame-rate landmark verification algorithm.
  - `mimic-mcp/src/whisper.ts`: Whisper transcription invocation.
- **New Modules to Develop:**
  - `src/timing/whisper-transcriber.ts`: Transcribes voiceover and outputs word-level JSON with start/end frames.
  - `src/timing/pause-tightener.ts`: FFmpeg `silencedetect` audio filter excising gaps > 0.35s.
  - `src/timing/phrase-snapper.ts`: Clusters words into natural phrases and snaps scene boundaries to phrase ends with 2–4 lead frames.
  - `src/timing/timeline-solver.ts`: Quantizes all scene boundaries to integer frames and verifies that `sum(scene_durations) == total_audio_frames`.
- **Automated Acceptance Gate:** For any audio file, the solver outputs integer-frame scene bounds matching phrase pauses within +-2 frames, with 0 frames of cumulative drift.
- **Estimate:** 4–6 engineering days.
- **Exit Artifact:** Automated timing test suite demonstrating drift-free scene snapping across 15s, 30s, and 45s audio tracks.

---

## Build Phase D — Deterministic Quality Gates
- **Goal & User-Visible Outcome:** A strict gatekeeper service that evaluates rendered scene clips against 7 deterministic blocking checks, preventing defective videos from reaching composition.
- **Requirements Covered:** `REQ-DOC-03`, `REQ-DOC-04`, `REQ-TYP-02`, `REQ-TYP-03`, `REQ-QA-01` through `REQ-QA-07`.
- **Code to Reuse/Adapt:**
  - `mimic-mcp/src/safe-area.ts`: Instagram Reels bounding-box collision algorithm.
  - `mimic-mcp/src/loudness.ts`: Two-pass `-14 LUFS` EBU R128 loudness verification.
  - `mimic-mcp/src/frame-quality.ts`: Grayscale raster brightness and contrast analysis.
  - `OpenMontage/lib/slideshow_risk.py`: Cleanroom TypeScript port of 6-dimension monotony scorer.
- **New Modules to Develop:**
  - `src/qa/gatekeeper.ts`: Master evaluator orchestrating all deterministic checks.
  - `src/qa/static-limit-gate.ts`: Sliding-window frame difference checker detecting frozen visuals > `max_static_s`.
  - `src/qa/reading-speed-gate.ts`: Validates character-per-second dwell time: `frames >= (chars / 18.0) * fps`.
  - `src/qa/transition-budget-gate.ts`: Verifies non-hard cuts per 10s <= preset budget.
- **Automated Acceptance Gate:** Intentionally flawed test videos (text in bottom 35%, loudness at -8 LUFS, static screen for 4s, text dwell at 40 cps) are 100% blocked with exact structured diagnostic errors. A compliant fixture passes with 0 errors.
- **Estimate:** 6–9 engineering days.
- **Exit Artifact:** Comprehensive negative and positive test suite verifying all 7 blocking gates.

---

## Build Phase E — Composition, Caching, and Recovery
- **Goal & User-Visible Outcome:** Final video composition via FFmpeg, content-addressed multi-tier caching, and non-destructive post-production editing.
- **Requirements Covered:** `REQ-CMP-01`, `REQ-CMP-02`, `REQ-CMP-03`, `REQ-CMP-04`.
- **Code to Reuse/Adapt:**
  - `OpenMontage/lib/asset_cache.py`: Conceptual hashing pattern.
  - `OpenChatCut/server/media-acceleration.ts`: Cleanroom hardware encoder probe (NVENC/VideoToolbox).
- **New Modules to Develop:**
  - `src/composer/ffmpeg-composer.ts`: Assembles scene clips, burns styled ASS/SRT captions, ducks background music under narration, and runs loudnorm pass 2.
  - `src/composer/cache-manager.ts`: Hashes `sha256(IR + code + style + audio_slice)` to cache clips; re-renders only modified scenes.
  - `src/composer/edit-list-applier.ts`: Applies non-destructive trims, toggles, and reordering in the final FFmpeg concat pass without re-rendering clips.
- **Automated Acceptance Gate:** Editing scene 2 in a 4-scene project re-renders only scene 2 (scenes 1, 3, 4 hit cache). Export completes in < 5 seconds for cached clips.
- **Estimate:** 5–7 engineering days.
- **Exit Artifact:** Benchmarked caching and composition engine with verified non-destructive edit list support.

---

## Build Phase F — MCP Protocol State Machine & Director Skill
- **Goal & User-Visible Outcome:** External coding agents (Claude Code, Codex, Antigravity) can connect via MCP, follow the Director Doctrine, execute all 13 tools, and recover from context loss via `get_next_step()`.
- **Requirements Covered:** `REQ-005`, `REQ-DOC-01`, `REQ-DOC-05`, `REQ-DOC-06`, `REQ-MCP-01` through `REQ-MCP-05`.
- **Code to Reuse/Adapt:**
  - `manim-mcp/manim_mcp/server.py`: FastMCP server architecture and SSE pattern.
  - `short-video-maker/src/server/routers/mcp.ts`: Express SSE routing.
- **New Modules to Develop:**
  - `src/mcp/state-machine.ts`: FSM enforcing linear phase progression (`input` to `exported`).
  - `src/mcp/tools/*.ts`: Implement all 13 tools (`init_project`, `transcribe`, `tts`, `get_project_settings`, `get_doctrine`, `submit_plan`, `render_scene`, `render_status`, `inspect`, `submit_review`, `compose`, `export`, `get_next_step`).
  - `skills/reel-director/`: Director skill package containing Doctrine v0.1, presets catalog, worked examples, and anti-patterns.
- **Automated Acceptance Gate:** An autonomous agent script completes a full reel end-to-end via MCP. An agent session forcibly killed at `rendered` recovers its exact state using `get_next_step()`.
- **Estimate:** 6–8 engineering days.
- **Exit Artifact:** Tested MCP server and Director Skill package validated across simulated agent sessions.

---

## Build Phase G — Local React Web UI
- **Goal & User-Visible Outcome:** A human user can open `http://localhost:3000` to monitor the pipeline phase, view scene cards, play preview clips, inspect lint error highlights, and copy agent bootstrap prompts.
- **Requirements Covered:** `REQ-UI-01` through `REQ-UI-05`.
- **Code to Reuse/Adapt:**
  - `short-video-maker/src/ui/`: React 18, Vite, and Tailwind CSS web scaffolding.
- **New Modules to Develop:**
  - `ui/src/components/PhaseTracker.tsx`: Visual progress bar showing active phase and blockers.
  - `ui/src/components/SceneTimeline.tsx`: Cards for each scene with duration, renderer, and thumbnail.
  - `ui/src/components/LintDiagnostics.tsx`: Highlights safe zone violations and fast text frames.
  - `ui/src/components/VideoPlayer.tsx`: HTML5 player for intermediate clips and final export.
  - `ui/src/components/PromptPanel.tsx`: One-click copy for phase bootstrap prompts.
  - `ui/src/components/PostProductionControls.tsx`: Scene reordering and in/out point trimming.
- **Automated Acceptance Gate:** User can inspect a failed render, see the red safe-zone violation overlay, copy the fix prompt, and view the final export in the browser.
- **Estimate:** 5–7 engineering days.
- **Exit Artifact:** Fully responsive, local-first web control panel.

---

## Build Phase H — Hardening, Tuning & Benchmarking
- **Goal & User-Visible Outcome:** Comprehensive security hardening, automated CI pipelines, performance benchmarks across hardware configurations, and empirical preset tuning.
- **Requirements Covered:** `REQ-SEC-01`, `REQ-SEC-02`, `REQ-LIC-01`, `REQ-CFG-03`.
- **Deliverables:**
  - Security audit verifying zero bypass of AST sandbox and process boundaries.
  - Performance benchmark suite measuring render latency, cache hit rates, and memory usage.
  - Retention tuning experiment: rendering 15s/30s/45s reels across `punchy` vs `calm` pacing presets.
  - Documentation and deployment packaging (local CLI installer and optional Docker container).
- **Estimate:** 5–7 engineering days.
- **Exit Artifact:** Hardened, production-ready v0.1 release with verified performance baselines.
