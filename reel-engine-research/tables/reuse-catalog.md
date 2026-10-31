# Top 10 Reusable Components Catalog

A catalog of the ten most valuable software components discovered across the audited repositories, evaluated for direct reuse, adaptation, cleanroom extraction, or licensing safety.

---

| Rank | Component Name | Source Repository & Path | License | Primary Function & Architectural Value | Adaptation Strategy |
|:---:|---|---|:---:|---|---|
| **1** | **AST Code Security Sandbox** | `manim-mcp`<br>`manim_mcp/core/sandbox.py` | **MIT** | Parses Python code via `ast.parse()`; blocks 26 dangerous modules, builtins (`eval`, `open`, `exec`), and dunder escapes (`__subclasses__`). Essential for securing agent-authored Manim code. | **Direct Reuse (As-Is)**. Integrate into Reel Engine's Manim execution adapter. |
| **2** | **Safe Area Collision Checker** | `mimic-mcp`<br>`src/safe-area.ts` | **MIT** | Evaluates normalized rectangular coordinates against Instagram Reels and TikTok UI chrome (action rails, bottom captions, profile headers). Detects text occlusions. | **Direct Reuse (As-Is)**. Adapt to receive Reel Engine's Scene IR text and layout bounding boxes. |
| **3** | **Two-Pass Loudness Normalizer** | `mimic-mcp`<br>`src/loudness.ts` | **MIT** | Parses FFmpeg two-pass `loudnorm` filter JSON output; strictly enforces -14 LUFS integrated target and -1 dBTP true-peak ceiling. Pure, zero-dependency logic. | **Direct Reuse (As-Is)**. Wire into Phase D audio QA gate and Phase E compose step. |
| **4** | **Frame Quality & Contrast Analyzer** | `mimic-mcp`<br>`src/frame-quality.ts` | **MIT** | Analyzes decoded grayscale frame buffers for mean luma brightness, contrast standard deviation, and edge detail gradients. Evaluates thumbnail exposure. | **Direct Reuse (As-Is)**. Call on sampled frames extracted during scene inspection. |
| **5** | **Async Manim Rendering Worker** | `manim-mcp`<br>`manim_mcp/core/renderer.py` | **MIT** | Asynchronously executes Manim Community Edition or ManimGL with strict execution timeouts, concurrency semaphores, and error traceback sanitization. | **Adapt**. Package into a lightweight local Python worker service callable by Reel Engine. |
| **6** | **Preset & Segment Timing Schema** | `mimic-mcp`<br>`src/presets.ts` | **MIT** | Zod schemas defining segment duration, caption styles, kinetic typography (karaoke, typewriter), and zoom easing curves (`easeIn`, `easeInOut`). | **Adapt**. Extend schema to match Reel Engine's layered ProjectConfig model. |
| **7** | **Unified Express MCP & REST Server** | `short-video-maker`<br>`src/server/server.ts` | **MIT** | Mounts both REST endpoints (`/api`) and Model Context Protocol Server-Sent Events (`/mcp`) on a single port while serving static compiled web assets. | **Adapt**. Use as the base networking skeleton for Reel Engine's local server and UI host. |
| **8** | **Local Web Control Panel (UI)** | `short-video-maker`<br>`src/ui/App.tsx` | **MIT** | Standalone React 18, Vite, and Tailwind CSS web application for inspecting generated video output, viewing render status, and triggering jobs. | **Adapt**. Re-skin into Reel Engine's Phase View, Scene Timeline, and Quality Lint Inspector. |
| **9** | **Slideshow Monotony Scoring Engine** | `OpenMontage`<br>`lib/slideshow_risk.py` | **AGPL-3.0** | Formalizes 6 qualitative dimensions (repetition, decorative visuals, weak motion, weak shot intent, typography overreliance, cinematic claims) into a 0–5 risk score. | **Cleanroom Reimplementation**. Re-author the scoring formulas and thresholds in TypeScript under MIT to avoid AGPL copyleft infection. |
| **10** | **Hardware Video Acceleration Probe** | `OpenChatCut`<br>`server/media-acceleration.ts` | **AGPL-3.0** | Probes host GPU capabilities to select optimal H.264 hardware encoders (NVIDIA NVENC, Apple VideoToolbox, Intel QSV, AMD AMF) with graceful fallback to `libx264`. | **Cleanroom Reimplementation**. Re-write hardware encoder probing logic in TypeScript under MIT. |

---

## Licensing & Extraction Strategy Summary
- **MIT Components (Ranks 1–8):** Can be safely vendor-copied or adapted directly with original copyright notices preserved.
- **AGPL Components (Ranks 9–10):** Must **never** be copied verbatim or statically linked. Their mathematical and algorithmic concepts are adopted via cleanroom TypeScript implementation.
