# Requirements-to-Code Traceability Matrix

This matrix maps every atomic requirement from Phase 4 across all five audited repositories to determine code reuse suitability, adaptation effort, and missing implementation work.

Candidate Status Definitions:
- **Reuse As-Is**: Compatible contract, verified tests, permissive license (MIT/Apache).
- **Adapt**: Solid implementation, requires interface wrapping or refactoring (MIT).
- **Reference Only**: Useful conceptual design, but copying is restricted by AGPL license or excessive coupling.
- **New Implementation**: No adequate code located; must be built from scratch.
- **Defer**: Explicitly out of scope for v0.1 MVP.

---

## 1. Traceability Matrix Table

| Req ID | Requirement Summary | OpenMontage (`195eab`) | OpenChatCut (`7fa4b7`) | mimic-mcp (`9dca83`) | short-video-maker (`9bb9a2`) | manim-mcp (`efd75c`) | Best Candidate | Missing Work & Adaptation Strategy | Confidence |
|---|---|---|---|---|---|---|:---:|---|:---:|
| **REQ-001** | End-to-end vertical 9:16 video generation | Partial (`render_demo.py`) | Implemented (`remotion/render.mjs`) | Partial (`src/index.ts`) | Implemented (`ShortCreator.ts`) | Absent (math only) | **Adapt (SVM + MM)** | Combine SVM server/pipeline structure with MM quality gates. | High |
| **REQ-002** | Social platform publishing non-goal | Absent | Absent | Absent | Absent | Absent | **Defer** | Out of scope for v0.1. | High |
| **REQ-003** | Platform analytics ingestion non-goal | Absent | Absent | Absent | Absent | Absent | **Defer** | Out of scope for v0.1. | High |
| **REQ-004** | Multi-language typography non-goal | Partial (RTL in `CaptionOverlay.tsx`) | Absent | Absent | Absent | Absent | **Defer** | Focus on English Latin typography for v0.1. | High |
| **REQ-005** | Agent as director, MCP/UI as production crew | Concept (`AGENTS.md`) | Partial (`src/agent/`) | Partial (`src/index.ts`) | Partial (`src/server/routers/mcp.ts`) | Implemented (`manim_mcp/server.py`) | **New Implementation** | Build strict phased MCP state machine orchestrator. | High |
| **REQ-DOC-01** | Single-sentence core idea enforcement | Concept in agent guides | Absent | Absent | Absent | Absent | **New Implementation** | Add Pydantic/Zod validator rejecting conjunctions ("and"). | High |
| **REQ-DOC-02** | Hook event in frame 1, complete by second 3.0 | Heuristic check | Absent | Partial (`presetSegmentSchema`) | Absent | Absent | **New Implementation** | Enforce event in frame 1 and duration ceiling in IR linter. | High |
| **REQ-DOC-03** | Max static interval budget (<= 2.5s) | Partial (`lib/verify_scene_pacing.py`) | Advisory (`sceneQuality.ts`) | Absent | Absent | Absent | **Adapt (OM concept)** | Cleanroom TypeScript implementation of frame-difference linter. | High |
| **REQ-DOC-04** | Text and visuals inside safe zone & 3:4 crop | Absent (CSS %) | Advisory overlay | Implemented (`src/safe-area.ts`) | Absent | Absent | **Reuse As-Is (MM)** | Use `mimic-mcp` bounding box collision algorithm. | High |
| **REQ-DOC-05** | At least one send moment | Absent | Absent | Absent | Absent | Absent | **New Implementation** | Add boolean `send_moment` flag to Scene IR schema. | High |
| **REQ-DOC-06** | End on payoff and design loop | Absent | Absent | Absent | Absent | Partial (scene arc) | **New Implementation** | Add rubric validation in `submit_review` gate. | High |
| **REQ-DOC-07** | Consistent motion language across renderers | Partial (`styles/`) | Absent | Partial (`brand-kit.ts`) | Absent | Partial (`quality.py`) | **New Implementation** | Define unified ProjectConfig style tokens imported by Remotion and Manim. | High |
| **REQ-CFG-01** | Modular independent preset layers | Partial (`config.yaml`) | Partial (`llm-config.ts`) | Implemented (`src/presets.ts`) | Partial (`config.ts`) | Partial (`config.py`) | **Adapt (MM)** | Extend `mimic-mcp` Zod schema to support all 8 preset layers. | High |
| **REQ-CFG-02** | Default format preset `reel_9x16` | Partial (`1920x1080` default) | Partial (1080x1920) | Implemented (`src/presets.ts`) | Implemented (`portrait`) | Partial (`1080x1920`) | **Reuse As-Is (MM)** | Adopt MM output schema: 1080x1920 @ 30fps. | High |
| **REQ-CFG-03** | Pacing presets (punchy, balanced, calm) | Heuristic (`config.yaml`) | Absent | Absent | Absent | Absent | **New Implementation** | Author preset JSON files with parameterized static limits. | High |
| **REQ-CFG-04** | Bundle 4 starter presets | Partial | Absent | Partial (`bold-hook-tips.json`) | Absent | Absent | **New Implementation** | Create Quick Tip, Explainer, Story, and Concept Animation presets. | High |
| **REQ-SIR-01** | Canonical scene types | Absent | Absent | Partial (`captionStyle`) | Absent | Absent | **New Implementation** | Define Zod/Pydantic enum for 7 canonical scene types. | High |
| **REQ-SIR-02** | Mandatory Scene IR fields | Partial (pipeline steps) | Partial (timelines) | Partial (recipe segments) | Partial (SceneInput) | Partial (SceneModel) | **New Implementation** | Formalize Section 5.2 Scene IR JSON schema. | High |
| **REQ-SIR-03** | Frame-accurate visual events array | Partial (TerminalScene steps) | Absent | Absent | Absent | Absent | **New Implementation** | Implement event schedule in Scene IR with frame delta checks. | High |
| **REQ-TIM-01** | Audio is master clock; integer frames | Partial (`verify_scene_pacing.py`) | Implemented (`server/media-timecode.ts`) | Partial (seconds floats) | Naive floats | Floats | **Adapt (OCC concept)** | Use integer frame quantization; cleanroom rewrite of GCD frame math. | High |
| **REQ-TIM-02** | Whisper word-level timestamps | Partial (`tools/subtitle/`) | Implemented (`sync-whisper-cli.mjs`) | Implemented (`src/whisper.ts`) | Implemented (`Whisper.ts`) | Absent | **Reuse As-Is (MM/SVM)** | Integrate local Whisper binary or whisper.cpp runner. | High |
| **REQ-TIM-03** | Optional pause tightening | Absent | Absent | Absent | Absent | Absent | **New Implementation** | Add silence detection filter in FFmpeg to trim unvoiced gaps. | Medium |
| **REQ-TIM-04** | Snap cuts to speech phrase ends | Implemented (`verify_scene_pacing.py`) | Partial | Absent | Absent | Absent | **Adapt (OM concept)** | Cleanroom algorithm snapping scene bounds to Whisper word breaks. | High |
| **REQ-REN-01** | Route motion graphics to Remotion | Implemented (`remotion-composer/`) | Implemented (`remotion/render.mjs`) | Implemented (`templates/remotion`) | Implemented (`components/videos`) | Absent | **Adapt (MM + OCC)** | Use headless Remotion bundling with OCC hardware acceleration. | High |
| **REQ-REN-02** | Route math & science to Manim | Absent | Absent | Absent | Absent | Implemented (`renderer.py`) | **Direct Reuse (MMCP)** | Encapsulate `manim-mcp` worker as the Manim adapter. | High |
| **REQ-REN-03** | Render isolated, mute scene clips | Absent (full video) | Absent (full video) | Absent (full video) | Absent (full video) | Implemented (single clips) | **Adapt (MMCP concept)** | Render scenes individually to content-addressed MP4 files. | High |
| **REQ-REN-04** | Shared scene helper library | Partial | Absent | Absent | Absent | Partial (`code_bridge.py`) | **New Implementation** | Author shared styling API in TS (Remotion) and Python (Manim). | High |
| **REQ-TRN-01** | Transition library (cut, zoom, swipe) | Partial (`transitions/`) | Partial | Partial (`src/presets.ts`) | Absent | Absent | **New Implementation** | Implement Remotion transition wrappers and Manim transforms. | High |
| **REQ-TRN-02** | Heavy transition budget enforcement | Absent | Absent | Absent | Absent | Absent | **New Implementation** | Linter counts non-hard cuts per 10s of project runtime. | High |
| **REQ-TRN-03** | Element entrances ease out (6-12 frames) | Partial | Absent | Partial (`src/presets.ts`) | Absent | Partial (`quality.py`) | **New Implementation** | Package standard cubic-bezier easing tokens into helper library. | High |
| **REQ-TYP-01** | Phrase captions with keyword highlight | Implemented (`CaptionOverlay.tsx`) | Absent | Implemented (`src/captions.ts`) | Partial (`Whisper.ts`) | Absent | **Adapt (OM + MM)** | Combine OM's Remotion component with MM's event parser. | High |
| **REQ-TYP-02** | Minimum reading dwell time (17-20 cps) | Absent | Absent | Absent | Absent | Absent | **New Implementation** | Deterministic linter rule: `dwell_frames >= (chars / 18) * fps`. | High |
| **REQ-TYP-03** | Text contrast against sampled pixels | Absent | Absent | Implemented (`src/frame-quality.ts`) | Absent | Absent | **Reuse As-Is (MM)** | Use MM's luma variance and contrast math on frame crops. | High |
| **REQ-QA-01** | Render completion gate (exit code 0) | Partial | Implemented (`render.verify.mjs`) | Partial | Absent | Implemented (`test_renderer.py`) | **Adapt (MMCP/OCC)** | Wrap process execution with strict zero-exit verification. | High |
| **REQ-QA-02** | Duration match gate (exact frame count) | Absent | Partial (`media-timecode.ts`) | Partial | Absent | Partial | **New Implementation** | ffprobe frame counting compared against IR frame delta. | High |
| **REQ-QA-03** | Hook event gate | Absent | Absent | Absent | Absent | Absent | **New Implementation** | Linter checks event in frame 1 and frame diff by second 3. | High |
| **REQ-QA-04** | Static interval gate (no static > 2.5s) | Absent | Advisory | Absent | Absent | Absent | **New Implementation** | FFmpeg `mpdecimate` or pixel difference analysis over windows. | High |
| **REQ-QA-05** | Safe zone & 3:4 crop blocking gate | Absent | Advisory | Implemented (`src/safe-area.ts`) | Absent | Absent | **Reuse As-Is (MM)** | Direct invocation of `checkSafeArea()` blocking on violations. | High |
| **REQ-QA-06** | Audio loudness gate (-14 LUFS) | Partial | Partial | Implemented (`src/loudness.ts`) | Partial | Absent | **Reuse As-Is (MM)** | Call `parseLoudnorm()` and reject if loudness > -13 or < -15 LUFS. | High |
| **REQ-QA-07** | Transition budget gate | Absent | Absent | Absent | Absent | Absent | **New Implementation** | IR check calculating heavy transitions per 10s. | High |
| **REQ-QA-08** | Advisory visual quality review | Absent | Partial (`src/agent/vision.ts`) | Absent | Absent | Partial (`quality.py`) | **Adapt (OCC vision)** | Optional LLM vision prompt evaluating sampled frame clutter. | Medium |
| **REQ-CMP-01** | FFmpeg composition, captions, audio mix | Partial | Partial | Partial (`src/ffmpeg.ts`) | Partial | Absent | **New Implementation** | FFmpeg filter graph: concat clips, burn ASS/SRT, loudnorm mux. | High |
| **REQ-CMP-02** | Content-addressed scene caching | Implemented (`asset_cache.py`) | Absent | Absent | Absent | Partial (`storage.py`) | **Adapt (OM concept)** | Compute SHA-256 of IR + code + style + audio slice. | High |
| **REQ-CMP-03** | Non-destructive export edit list | Absent | Partial (`timelineDelta.ts`) | Absent | Absent | Absent | **New Implementation** | Apply trims, toggles, and reordering in final FFmpeg concat file. | High |
| **REQ-CMP-04** | Draft (540x960) vs final (1080x1920) | Partial | Implemented (`render-contract.mjs`) | Absent | Absent | Implemented (`low`/`high`) | **Adapt (OCC/MMCP)** | Map render profile parameter to canvas scale and fps flags. | High |
| **REQ-MCP-01** | Strict linear phase state machine | Absent | Partial (`serverRunState.ts`) | Partial | Partial | Partial | **New Implementation** | Finite State Machine rejecting illegal transitions. | High |
| **REQ-MCP-02** | Unified response envelope (phase, status) | Absent | Partial (`tool-schema.ts`) | Absent | Absent | Partial | **New Implementation** | Standardized JSON envelope wrapping all tool outputs. | High |
| **REQ-MCP-03** | `get_next_step()` recovery tool | Absent | Absent | Absent | Absent | Absent | **New Implementation** | Inspects project state and returns actionable next step. | High |
| **REQ-MCP-04** | Core 13 MCP tools | Absent | Partial | Partial | Partial | Partial (`tools/generate.py`)| **New Implementation** | Implement all 13 tools defined in Section 12.2. | High |
| **REQ-MCP-05** | Rubric gate before compose | Absent | Absent | Absent | Absent | Absent | **New Implementation** | Reject compose if rubric has any 0 or sum < passing threshold. | High |
| **REQ-UI-01** | UI displays phase, scenes, timeline | Partial (Backlot) | Implemented (NLE) | Absent | Implemented (`src/ui/`) | Absent | **Adapt (SVM UI)** | Adapt SVM React web UI to show Reel Engine project state. | High |
| **REQ-UI-02** | UI displays deterministic lint reports | Absent | Partial | Absent | Absent | Absent | **New Implementation** | Render structured lint errors on timeline scenes. | High |
| **REQ-UI-03** | UI integrated video preview player | Implemented (Backlot) | Implemented (NLE) | Absent | Implemented (`src/ui/`) | Absent | **Adapt (SVM UI)** | HTML5 video player playing clips and final export. | High |
| **REQ-UI-04** | UI generates agent bootstrap prompts | Absent | Absent | Absent | Absent | Absent | **New Implementation** | UI prompt panel generating phase-specific agent kickoffs. | High |
| **REQ-UI-05** | UI non-destructive post-production edits | Absent | Implemented (NLE) | Absent | Absent | Absent | **New Implementation** | Add simple scene reorder/trim controls modifying edit list. | High |
| **REQ-SEC-01** | AST security sandbox for Manim code | Absent | Absent | Absent | Absent | Implemented (`sandbox.py`) | **Direct Reuse (MMCP)** | Wire `CodeSandbox` into Manim scene compilation gate. | High |
| **REQ-SEC-02** | Sandboxed execution, no network in render | Implemented (`test_network_guard`) | Partial | Absent | Absent | Partial | **Adapt (OM/MMCP)** | Execute renderer processes in air-gapped sandbox. | High |
| **REQ-LIC-01** | Clean permissive licensing (MIT/Apache) | **Fails (AGPL-3.0)** | **Fails (AGPL-3.0)** | **Passes (MIT)** | **Passes (MIT)** | **Passes (MIT)** | **Cleanroom Arch** | Core engine built under MIT/Apache using MM, SVM, and MMCP. | High |
