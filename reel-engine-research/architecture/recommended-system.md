# Recommended System Architecture — Reel Engine v0.1

This document specifies the target architecture for the Reel Engine based on **Strategy D (Greenfield Core with Selective MIT Library Reuse and Cleanroom Algorithms)**.

---

## 1. System Overview & Component Topology

The Reel Engine operates as a local-first client-server system designed to guide an AI coding agent (acting as Creative Director) through an automated video production pipeline.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 EXTERNAL CODING AGENT                                  │
│              (Claude Code / Codex / Antigravity Agent acting as Director)              │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Model Context Protocol (stdio / SSE)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                REEL ENGINE CORE SERVER                                 │
│                                  (TypeScript / Node.js)                                │
│                                                                                        │
│  ┌─────────────────────────┐  ┌──────────────────────────┐  ┌───────────────────────┐  │
│  │   MCP State Machine     │  │    Project State Store   │  │   Local REST & UI     │  │
│  │   - Phase Enforcement   │  │    - SQLite / JSON       │  │   - Express on :3000  │  │
│  │   - get_next_step()     │  │    - atomic persistence  │  │   - Static React SPA  │  │
│  └────────────┬────────────┘  └─────────────┬────────────┘  └───────────┬───────────┘  │
│               │                             │                           │              │
│               ▼                             ▼                           ▼              │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        TIMING & AUDIO SUBSYSTEM                                  │  │
│  │  - Whisper Transcription Engine (word-level timestamps)                          │  │
│  │  - Audio Master Clock & Integer-Frame Quantization Solver                        │  │
│  │  - Silence / Pause Tightener & Phrase-End Cut Snapper                            │  │
│  └──────────────────────────────────────────┬───────────────────────────────────────┘  │
│                                             │                                          │
│               ┌─────────────────────────────┴─────────────────────────────┐            │
│               ▼                                                           ▼            │
│  ┌───────────────────────────────┐                       ┌──────────────────────────┐  │
│  │    REMOTION SCENE ADAPTER     │                       │   MANIM SCENE ADAPTER    │  │
│  │    - reel-remotion-helpers    │                       │   - reel_manim_helpers   │  │
│  │    - Headless worker process  │                       │   - Local Python Worker  │  │
│  │    - Content-addressed cache  │                       │   - AST Code Sandbox     │  │
│  └────────────┬──────────────────┘                       └────────────┬─────────────┘  │
│               │ (Independent Scene Clips .mp4)                        │                │
│               └─────────────────────────────┬─────────────────────────┘                │
│                                             │                                          │
│                                             ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        DETERMINISTIC QUALITY GATEKEEPER                          │  │
│  │  [Gate 1] Exit Code 0 & Process Integrity                                       │  │
│  │  [Gate 2] Frame Count Match (actual == planned frames)                           │  │
│  │  [Gate 3] Hook Event Delivery (event in frame 1, promise by second 3.0)          │  │
│  │  [Gate 4] Static Interval Window (no frozen frames > max_static_s)               │  │
│  │  [Gate 5] Safe Area & 3:4 Center Crop Containment (mimic-mcp)                    │  │
│  │  [Gate 6] Text Legibility & Reading Dwell Time (>= 18 chars/sec)                 │  │
│  │  [Gate 7] Frame Quality & Contrast Verification (mimic-mcp)                      │  │
│  │  [Gate 8] Audio Loudness Normalization (-14 LUFS / -1 dBTP)                      │  │
│  │  [Gate 9] Transition Budget Compliance (<= max_heavy_per_10s)                    │  │
│  │  [Gate 10] Creative Self-Review Rubric (zero score check)                        │  │
│  └──────────────────────────────────────────┬───────────────────────────────────────┘  │
│                                             │ (All 10 Gates Pass)                      │
│                                             ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           FFMPEG COMPOSITION ENGINE                              │  │
│  │  - Concat scene clips with edit-list trim/reorder rules                          │  │
│  │  - Overlay and burn synchronized kinetic captions                                │  │
│  │  - Mix master narration + background music with dynamic ducking                  │  │
│  │  - Two-pass loudnorm audio filter to export final MP4                             │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Subsystems and Responsibilities

### 2.1 MCP State Machine & Orchestrator
- **Role:** Enforces the strict linear lifecycle: `input` -> `transcribed` -> `planned` -> `authored` -> `rendered` -> `verified` -> `composed` -> `exported`.
- **Invariants:** Out-of-order tool calls return HTTP/JSON-RPC error code with a descriptive `next_step` directive. The orchestrator is completely self-healing: `get_next_step()` re-syncs any agent that lost its context window.

### 2.2 Timing & Audio Subsystem
- **Master Clock:** All temporal positions are stored as non-negative integer frames at the project frame rate (default 30 fps).
- **Speech Snapping:** Whisper word timestamps are clustered into phrase boundaries. Scene transitions automatically snap to phrase ends with a 2–4 frame lead.
- **Pause Tightening:** Silences exceeding `tighten_pauses_s` (default 0.35s) are excised before scene boundaries are quantized.

### 2.3 Dual-Renderer Adapter Subsystem
- **Routing:**
  - `RemotionAdapter`: Compiles TSX components for kinetic typography, UI cards, data charts, and overlays.
  - `ManimAdapter`: Calls local Python worker running `manimgl` or Manim Community Edition for 3D transforms, geometry, and formulas.
- **Shared Helpers:** Both renderers import standardized layout tokens:
  - Canvas: 1080 x 1920 (9:16 vertical).
  - Safe Margins: Top 14% (269px), Bottom 35% (672px), Sides 6% (65px).
  - 3:4 Crop Guard: Horizontal 1080px by vertical 1440px centered bounding box.
- **Scene Isolation:** Every scene renders to an independent, mute clip cached by content hash: `sha256(IR + code + style + audio_slice)`.

### 2.4 Deterministic Quality Gatekeeper
- **Hard Enforcement:** Blocks the `composed` transition if any of the 10 deterministic gates fail.
- **Actionable Diagnostics:** Gatekeeper returns structured error objects detailing:
  - `scene_id`: Which scene failed.
  - `frame_range`: Start and end frame of the violation.
  - `violation_type`: E.g., `SAFE_ZONE_OVERLAP`, `TEXT_TOO_FAST`, `AUDIO_CLIPPING`.
  - `evidence_frame`: Exact sampled frame path for visual inspection.
  - `suggested_fix`: Concrete remediation instruction for the agent.

### 2.5 Local Web UI Control Panel
- **Host:** Express server serving compiled Vite/React SPA on `http://localhost:3000`.
- **Features:** Phase progression status, interactive scene list, visual lint issue overlays, video preview player, non-destructive trim/toggle controls, and copyable agent bootstrap prompts.

---

## 3. Technology Stack Selection

| Component | Selected Technology | License | Justification |
|---|---|---|---|
| **Core Server & FSM** | TypeScript / Node.js 24 | MIT | Native parity with Remotion, Vite, and MCP SDK. |
| **Data Contracts** | Zod (TypeScript) / Pydantic (Python) | MIT | Runtime schema validation and TypeScript type inference. |
| **Motion Renderer** | Remotion 4.0 | Remotion License / MIT helpers | Industry standard React-to-video compilation engine. |
| **Math Renderer** | Manim (Community Edition / ManimGL) | MIT | The definitive mathematical animation engine. |
| **Code Sandbox** | AST Visitor (`manim-mcp/core/sandbox.py`) | MIT | Zero-overhead, robust blocking of dangerous Python builtins. |
| **Quality Analysis** | `mimic-mcp` safe-area, loudness, frame-quality | MIT | Tested, mathematically sound vertical video QA algorithms. |
| **Composition & Mux** | FFmpeg (CLI subprocess) | LGPL-2.1+ | Rock-solid video concatenation, subtitle burn-in, and loudnorm. |
| **Local Web UI** | React 18, Vite, TailwindCSS | MIT | Lightweight, fast SPA with zero native desktop bloat. |

---

## 4. Security & Isolation Architecture

1. **Agent Python Code Sandboxing:** Agent-authored `.py` files pass through the AST Code Sandbox prior to execution. Any script attempting to import `os`, `subprocess`, `requests`, `socket`, or access dunder attributes (`__subclasses__`) is immediately aborted with a blocking security error.
2. **Process Sandboxing:** Render workers execute in sandboxed sub-processes with read-only access to source assets and no external network egress.
3. **Local Loopback Isolation:** The server binds strictly to `127.0.0.1` by default, preventing external network probing.
