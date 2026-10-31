# Atomic Requirements Specification — Reel Engine v0.1

This document translates the **Reel Engine Design Document v0.1** into an unambiguous, traceable engineering requirements contract. Every normative statement is assigned a unique stable ID, prioritized using RFC 2119 keywords (**MUST**, **SHOULD**, **LATER**), and mapped to a concrete verification method.

---

## 1. Product Goals, Non-Goals, and Definitions

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-001** | §1, §9.1 | The engine **MUST** turn an input script or narration audio track into a finished vertical 9:16 video (.mp4). | **MUST** | End-to-end integration test | Complete playable MP4 generated from audio/script with matching duration and synced visuals. | None. |
| **REQ-002** | §1 | Publishing directly to social platforms (Instagram API, TikTok API, YouTube API) is a **NON-GOAL** for v0.1. | **NON-GOAL** | Inspection | No publishing endpoints or credentials required in v0.1. | Deferred to v1+. |
| **REQ-003** | §1 | Live platform analytics ingestion is a **NON-GOAL** for v0.1. | **NON-GOAL** | Inspection | System functions entirely local-first without production telemetry. | Deferred to v1+. |
| **REQ-004** | §1 | Multi-language typography and complex non-Latin script shaping are **NON-GOALS** for v0.1. | **NON-GOAL** | Inspection | English Latin-script typography prioritized in v0.1 starter presets. | Multi-language typography deferred. |
| **REQ-005** | §1, §10 | A coding agent **MUST** act as creative director, while the MCP server and UI act as the production crew holding constraints and rendering scenes. | **MUST** | Protocol test | Server rejects out-of-order calls and validates creative decisions against doctrine rules. | None. |

---

## 2. Director Doctrine & Pacing Invariants

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-DOC-01** | §3 (Rule 1) | The system **MUST** require a single-sentence core idea for the video before scene planning proceeds. | **MUST** | Schema validation | Project IR contains non-empty `core_idea` string without conjunction splitting ("and"). | Linter warning if "and" detected. |
| **REQ-DOC-02** | §3 (Rule 2, 3) | The hook scene **MUST** land an event in frame 1 and complete its promise by second 3.0 (configurable via preset). | **MUST** | Automated IR & Frame QA | Scene IR contains visual event at `start_frame == 0` and hook completes within `hook_complete_s * fps`. | Exact hook duration is preset-configurable. |
| **REQ-DOC-03** | §3 (Rule 4), §6 | The timeline **MUST NOT** exceed the preset `max_static_s` (default 2.5s) without a registered visual event. | **MUST** | Deterministic Linter | IR event schedule has delta between adjacent visual events `<= max_static_s * fps`. | Frame-difference verification needed on rendered clips. |
| **REQ-DOC-04** | §3 (Rule 6, 8) | All on-screen text and primary focal elements **MUST** remain strictly inside the defined safe zone and survive a 3:4 center crop. | **MUST** | Pixel/Bounding Box QA | Text bounding boxes strictly inside top 14%, bottom 35%, side 6%, and horizontal 3:4 crop bounds. | Hard blocking gate. |
| **REQ-DOC-05** | §3 (Rule 9) | The scene plan **SHOULD** contain at least one designated `send_moment: true` scene. | **SHOULD** | Schema check | At least one scene in the IR has `send_moment: true`. | Advisory if omitted. |
| **REQ-DOC-06** | §3 (Rule 10, 11)| The video **MUST** end on the payoff, without generic conversational sign-offs, and **SHOULD** connect its final frame to frame 1 for seamless looping. | **SHOULD** | Linter & Rubric check | Scene IR final scene is `payoff` or `loop` type; rubric checks loop connection. | Self-review rubric gate. |
| **REQ-DOC-07** | §3 (Rule 12) | The project **MUST** share a single unified motion language, easing curve family, and color palette across all scenes regardless of renderer. | **MUST** | Style token validation | All scene code imports tokens from central ProjectConfig style dictionary. | Cross-renderer token sharing. |

---

## 3. Configuration & Preset Layers

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-CFG-01** | §4.1, §4.2 | Project configuration **MUST** be defined as independent, modular preset layers: Format, Duration, Pacing, Style, Captions, Transitions, Audio, Export. | **MUST** | JSON Schema / Zod | Validated configuration schema accepts overrides on any individual layer without breaking others. | Complete schema contract needed. |
| **REQ-CFG-02** | §4.1 | Default format preset `reel_9x16` **MUST** specify width=1080, height=1920, fps=30, safe_zone={top: 0.14, bottom: 0.35, side: 0.06}, center_crop="3:4". | **MUST** | Unit test | Format preset loads specified defaults. | Must allow overriding for future formats (1:1, 16:9). |
| **REQ-CFG-03** | §4.1 | Pacing presets **MUST** parameterize `hook_deadline_s`, `hook_complete_s`, `change_interval_s`, and `max_static_s`. | **MUST** | Unit test | Presets (`punchy`, `balanced`, `calm`) load distinct numeric thresholds. | Empirical tuning required. |
| **REQ-CFG-04** | §4.3 | System **MUST** bundle at least 4 starter presets: Quick Tip (15s), Explainer (30s), Story (45s), Concept Animation (30-45s). | **MUST** | Catalog test | Presets available in catalog and selectable by `init_project()`. | Complete definitions required. |

---

## 4. Scene Model & Scene Intermediate Representation (IR)

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-SIR-01** | §5.1 | Scene IR **MUST** support distinct canonical scene types: `hook`, `setup`, `beat`, `proof`, `reset`, `payoff`, `cta_loop`. | **MUST** | Schema validation | Any unknown scene type causes schema rejection. | Extensibility rules. |
| **REQ-SIR-02** | §5.2 | Each scene in the IR **MUST** specify: `id`, `type`, `start_frame`, `end_frame`, `narration`, `intent`, `renderer`, `layout`, `transition_in`, `events`, `assets`, `send_moment`. | **MUST** | Schema validation | Valid JSON structure matching section 5.2 schema. | All frame bounds must be non-negative integers. |
| **REQ-SIR-03** | §5.2 | The `events` array within a scene **MUST** record frame-accurate visual event landmarks (`frame`, `kind: "element_in" | "text_event" | "motion_change" | "cut"`). | **MUST** | Schema & Linter | Events mapped to project frame clock and validated against static limit budget. | Used by linter for visual change budget. |

---

## 5. Audio-Master Timing System

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-TIM-01** | §6 (Rule 1, 2) | Audio **MUST** serve as the master timeline clock; all timeline positions, scene start/end boundaries, and event points **MUST** be stored as integer frames at project fps. | **MUST** | Unit test & drift test | Total duration matches audio track frame count; zero accumulated drift between audio and visuals. | Rejects sub-frame floats in IR. |
| **REQ-TIM-02** | §6 (Rule 1) | The system **MUST** transcribe voiceover audio using Whisper to generate word-level timestamps. | **MUST** | Integration test | Returns array of words with start and end times in seconds and converted frames. | Local or containerized Whisper execution. |
| **REQ-TIM-03** | §6 (Rule 3) | The timing system **SHOULD** support optional silence/pause tightening to remove unvoiced gaps exceeding preset threshold (`tighten_pauses_s`). | **SHOULD** | Unit test | Audio silences above threshold trimmed before scene boundary quantization. | Configurable parameter (`audio.tighten_pauses_s`). |
| **REQ-TIM-04** | §6 (Rule 4) | Scene cuts **MUST** snap to speech phrase ends, applying a configurable lead (lead frames) before speech fade. | **MUST** | Timing test | Scene cuts fall within phrase end boundary tolerance. | Tunable lead frames parameter. |

---

## 6. Dual Renderer Architecture (Remotion & Manim)

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-REN-01** | §9.2 | The engine **MUST** route text-heavy motion graphics, UI mockups, charts, and captions to the Remotion (React) renderer. | **MUST** | Scene routing test | Remotion worker compiles TSX scene into clip. | Supported in build Phase B. |
| **REQ-REN-02** | §9.2 | The engine **MUST** route mathematical animations, geometry, coordinate transforms, and scientific visualizations to the Manim renderer. | **MUST** | Scene routing test | Manim worker executes Python script into clip. | Supported in build Phase B. |
| **REQ-REN-03** | §9.2 | Each scene in a video **MUST** be rendered as an independent, isolated video clip (.mp4) without audio. | **MUST** | File inspection | Scene directory contains isolated, mute scene clips matching planned frame lengths. | Audio mixed later in compose. |
| **REQ-REN-04** | §9.2 | The engine **MUST** provide a shared helper library for both Remotion and Manim exposing consistent canvas dimensions, safe zones, layouts, typography tokens, easing curves, and transitions. | **MUST** | API review & render test | Same styling tokens produce identical colors, margins, and safe boundaries across both renderers. | Normalized coordinate bridge. |

---

## 7. Motion & Transition System

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-TRN-01** | §7.1 | System **MUST** implement a transition library including `hard_cut` (0f), `zoom_punch` (6-10f), `swipe` (8-12f), `mask_reveal` (10-15f), and `match_cut` (0-6f). | **MUST** | Transition unit test | Transitions render correctly at specified frame durations. | Presets limit heavy transitions. |
| **REQ-TRN-02** | §7.1 | Heavy transitions (non-hard cuts) **MUST NOT** exceed preset budget (`max_heavy_per_10s`, default 1). | **MUST** | Deterministic Linter | Linter rejects IR with excessive heavy transitions. | Blocking QA check. |
| **REQ-TRN-03** | §7.2 | Element entrances **MUST** ease out (fast start, soft landing); entrance animations run 6 to 12 frames at 30 fps. | **MUST** | Helper library test | Default entrance easing curve satisfies fast start / soft landing. | Built into shared helpers. |

---

## 8. Typography, Captions & Legibility

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-TYP-01** | §8 | Captions **MUST** be rendered as phrase-based blocks (capped at ~7 words) with keyword highlighting, rather than single word-by-word flashing. | **MUST** | Caption parser test | Caption chunks contain 1 to 7 words; active keyword highlighted. | Matches Section 8 specification. |
| **REQ-TYP-02** | §8 | All text elements **MUST** satisfy a minimum on-screen reading speed dwell time (default ~17-20 characters per second). | **MUST** | Deterministic Linter | Text duration in frames `>= (character_count / reading_speed_cps) * fps`. | Blocks render if text disappears too quickly. |
| **REQ-TYP-03** | §8 | Rendered text **MUST** satisfy contrast ratio standards against sampled background pixels. | **MUST** | Frame sampling QA | Sampled text pixel contrast meets minimum threshold. | Uses frame-quality analysis. |

---

## 9. Automated Quality Gates

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-QA-01** | §11 | **Render Completion Gate:** Scene render process must exit with code 0 and produce valid MP4 without error logs. | **MUST** | Process exit test | Zero non-zero exit codes; clip file exists on disk. | **BLOCKING GATE**. |
| **REQ-QA-02** | §11 | **Duration Match Gate:** Rendered clip frame count must exactly equal IR planned frame duration (`end_frame - start_frame`). | **MUST** | ffprobe frame count | `actual_frames == planned_frames` with 0 frame discrepancy. | **BLOCKING GATE**. |
| **REQ-QA-03** | §11 | **Hook Event Gate:** Hook scene must contain registered visual event occurring within `hook_deadline_s`. | **MUST** | IR & frame check | Event exists at frame <= hook_deadline_frames. | **BLOCKING GATE**. |
| **REQ-QA-04** | §11 | **Static Interval Gate:** Video must not remain visually static longer than preset `max_static_s`. | **MUST** | Frame difference test | Pixel variance between frames within sliding window exceeds threshold. | **BLOCKING GATE**. |
| **REQ-QA-05** | §11 | **Safe Zone & Crop Gate:** All rendered text and bounding boxes must lie strictly inside safe zone and survive 3:4 crop. | **MUST** | Bounding box check | Zero text pixels or bounding boxes in top 14%, bottom 35%, side 6%. | **BLOCKING GATE**. |
| **REQ-QA-06** | §11 | **Audio Loudness Gate:** Mixed audio must normalize to -14 LUFS integrated loudness (+-1.0 LUFS) with true-peak <= -1.0 dBTP. | **MUST** | FFmpeg loudnorm | Output audio matches EBU R128 criteria without clipping. | **BLOCKING GATE**. |
| **REQ-QA-07** | §11 | **Transition Budget Gate:** Frequency of heavy transitions must not exceed preset threshold. | **MUST** | IR check | `count(heavy_transitions) / (total_seconds / 10) <= max_heavy`. | **BLOCKING GATE**. |
| **REQ-QA-08** | §11 | **Visual Quality Review (Advisory):** Sampled frames analyzed for visual appeal and clutter by vision model. | **SHOULD** | Model evaluation | Findings formatted as advisory report for agent/user; **does not block compose**. | Non-blocking advisory check. |

---

## 10. Composition, Caching, and Export

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-CMP-01** | §9.1, §9.3 | Composition **MUST** concatenate scene clips, burn in styled captions, and mix narration + background music via FFmpeg. | **MUST** | Compose test | Final MP4 contains all scene visuals, burned captions, and normalized audio. | Pure FFmpeg muxing. |
| **REQ-CMP-02** | §9.3 | Scene clips **MUST** be content-addressed and cached by hashing: `hash(IR entry + scene code + style tokens + audio slice)`. | **MUST** | Cache hit test | Modifying scene N re-renders only scene N; other scenes hit cache. | Multi-tier SHA-256 caching. |
| **REQ-CMP-03** | §9.4 | Post-production edits (trim in/out, scene order, mute/enable, aspect ratio) **MUST** be stored as a non-destructive edit list applied at export. | **MUST** | Export test | Original scene clips untouched; export applies edit list cleanly. | Stored in project state. |
| **REQ-CMP-04** | §9.3 | System **MUST** support draft renders (540x960 @ 24fps) for fast agent iteration, and full export (1080x1920 @ 30fps). | **MUST** | Render profile test | Draft renders complete faster; final export renders at full resolution. | Preset export profiles. |

---

## 11. MCP Protocol State Machine & Tools

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-MCP-01** | §12.1 | The MCP server **MUST** enforce a strict linear phase progression: `input` -> `transcribed` -> `planned` -> `authored` -> `rendered` -> `verified` -> `composed` -> `exported`. | **MUST** | State machine test | Out-of-order tool calls are refused with an error detailing the prerequisite phase. | Blocking state machine. |
| **REQ-MCP-02** | §12.1 | Every MCP tool response **MUST** return structured metadata: `phase`, `status`, `next_step`, and `blocked_by`. | **MUST** | Tool schema test | All tool responses conform to unified envelope schema. | Standardized response contract. |
| **REQ-MCP-03** | §12.1 | The server **MUST** provide `get_next_step()` tool to re-synchronize an agent that lost context or crashed. | **MUST** | Recovery test | Returns current phase, blockers, and exact recommended next tool invocation. | Recovery capability. |
| **REQ-MCP-04** | §12.2 | System **MUST** expose core toolset: `init_project`, `transcribe`, `tts`, `get_project_settings`, `get_doctrine`, `submit_plan`, `render_scene`, `render_status`, `inspect`, `submit_review`, `compose`, `export`, `get_next_step`. | **MUST** | MCP tool catalog test | All tools registered and discoverable via MCP tools list. | Defined in Section 12.2. |
| **REQ-MCP-05** | §10.3 | The server **MUST** require `submit_review(rubric)` before allowing transition from `rendered` to `composed`, requiring no zero scores and a minimum passing threshold. | **MUST** | Gate test | Compose blocked if self-review rubric has any score == 0 or sum < passing threshold. | Quality rubric gate. |

---

## 12. Local UI Responsibilities

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-UI-01** | §12.3 | The UI **MUST** display current project phase, scene list, render status, and visual timeline. | **MUST** | UI test | UI components render project state correctly. | Read-only state display. |
| **REQ-UI-02** | §12.3 | The UI **MUST** display deterministic lint reports with scene ID, frame range, severity, and suggested fixes. | **MUST** | UI test | Errors clearly highlighted on affected scenes. | Visual diagnostics. |
| **REQ-UI-03** | §12.3 | The UI **MUST** provide an integrated video preview player showing intermediate scene clips and final export. | **MUST** | UI test | Video playback functional in browser. | Video player integration. |
| **REQ-UI-04** | §12.3 | The UI **MUST** generate bootstrap prompts for the coding agent for each phase (kickoff, continue, fix scene N, restyle). | **MUST** | Prompt generator test | Copies actionable prompt to clipboard pointing agent to `get_next_step`. | Agent orchestration bridge. |
| **REQ-UI-05** | §12.3 | The UI **SHOULD** offer non-destructive post-production controls (reorder scenes, trim in/out, enable/disable). | **SHOULD** | UI test | Edits update non-destructive edit list without re-rendering clips. | Post-production controls. |

---

## 13. Cross-Cutting Concerns (Security, Licensing, Performance)

| ID | Source Section | Precise Requirement | Priority | Verification Method | Acceptance Criterion | Ambiguity / Decision Needed |
|---|---|---|:---:|---|---|---|
| **REQ-SEC-01** | §9.3 | Agent-authored Manim Python scene code **MUST** be validated via AST analysis to block dangerous modules (`os`, `subprocess`, etc.), builtins, and dunders before execution. | **MUST** | AST Security test | Malicious scripts rejected immediately without process execution. | Inherits `manim-mcp` AST sandbox. |
| **REQ-SEC-02** | §9.3 | Rendering processes **MUST** run sandboxed with restricted filesystem access and no external network egress during rendering. | **MUST** | Sandbox audit | Scene renderer cannot access external network or files outside project sandbox. | Terminal/process isolation. |
| **REQ-LIC-01** | §9.2 | Codebase **MUST** maintain clean licensing boundaries; core Reel Engine **MUST NOT** link AGPL code directly into proprietary or modular packages. | **MUST** | License audit | All core dependencies MIT, Apache-2.0, or BSD. Remotion licensing verified. | Cleanroom reimplementation of AGPL ideas. |
