# Master Feature Matrix — Cross-Repository Code Comparison

This matrix compares the verified source code implementations across all five candidate repositories. Every score is based on direct source code inspection and automated verification tests, using a standardized 0–4 scale:
- **0**: Absent or no code evidence located.
- **1**: Concept, schema definition, or prototype only.
- **2**: Partial implementation (functions exist, but missing edges or unhandled states).
- **3**: Fully implemented with credible tests and controls.
- **4**: Robustly implemented, operationally verified, production-grade.

---

## 1. Feature Comparison Table

| Feature Category / Capability | OpenMontage (`195eab`) | OpenChatCut (`7fa4b7`) | mimic-mcp (`9dca83`) | short-video-maker (`9bb9a2`) | manim-mcp (`efd75c`) | Key Observations & Code Citations |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **1. Remotion Integration** | **3** | **4** | **3** | **3** | **0** | OCC features broadcast-grade worker (`remotion/render.mjs`); OM features rich motion components (`CaptionOverlay.tsx`); MM provides headless templates; SVM has basic render call; MMCP has no Remotion. |
| **2. Manim Integration** | **0** | **0** | **0** | **0** | **4** | Only MMCP implements Manim (`manim_mcp/core/renderer.py`) with Community Edition to GL code bridge (`code_bridge.py`). All others have 0 Manim support. |
| **3. Code Sandboxing & Isolation** | **1** | **2** | **1** | **0** | **4** | MMCP has AST-level security sandbox (`sandbox.py`) blocking 26 modules and dangerous dunders; OCC has admission limiter; SVM runs raw unisolated code; OM has network guard. |
| **4. Safe Area Enforcement** | **0** | **1** | **3** | **0** | **0** | MM implements exact geometric bounding-box collision detection for Instagram Reels & TikTok (`src/safe-area.ts`). OCC has UI overlay only; OM uses unverified CSS percentages. |
| **5. Audio Loudness QA (-14 LUFS)** | **2** | **2** | **4** | **1** | **0** | MM provides pure FFmpeg two-pass `loudnorm` filter parser matching exact -14 LUFS spec (`src/loudness.ts`). OCC handles AAC encoder delay; SVM does basic normalization; OM does basic mix. |
| **6. Visual Quality / Contrast QA** | **1** | **1** | **3** | **0** | **2** | MM computes decoded gray raster brightness, contrast (std dev), and detail gradient (`src/frame-quality.ts`). OM/OCC use metadata heuristics; MMCP scores 3b1b animation rhythm. |
| **7. Monotony / Slideshow Risk Scoring** | **3** | **2** | **1** | **0** | **0** | OM formalizes 6-dimension slideshow risk score with fail thresholds (`lib/slideshow_risk.py`). OCC ports it as advisory-only (`src/agent/sceneQuality.ts:1`); SVM/MM/MMCP absent. |
| **8. Speech Landmark & Cut Alignment** | **3** | **3** | **2** | **1** | **0** | OM validates speech landmarks against UI step math within tolerance (`lib/verify_scene_pacing.py`). OCC handles broadcast timecode and GCD frame rates; SVM uses naive duration addition. |
| **9. MCP Protocol Compliance** | **0** | **3** | **3** | **2** | **4** | MMCP uses official `mcp.server.fastmcp.FastMCP` with SSE progress; OCC has full agent MCP runtime; MM exposes tools via standard MCP; SVM has basic Express SSE router; OM lacks MCP. |
| **10. Local UI Controls** | **2** | **4** | **1** | **3** | **1** | OCC provides full React/Electron NLE desktop UI; SVM has standalone React/Vite web UI (`src/ui/App.tsx`); OM has Backlot FastAPI storyboard; MM has studio link; MMCP has SSE progress endpoint. |
| **11. Preset & Style System** | **2** | **2** | **3** | **1** | **1** | MM defines Zod preset schemas for caption animations, typography, and zoom easing (`src/presets.ts`). OM defines YAML styles; others have minimal or hardcoded presets. |
| **12. Queue Persistence & Recovery** | **2** | **3** | **1** | **0** | **2** | OCC has recovery ledgers and draft stores; OM has checkpoint files; SVM has unpersisted in-memory array (`queue = []`); MMCP has SQLite render tracker; MM lacks persistence. |
| **13. License Permissiveness** | **0 (AGPL)** | **0 (AGPL)** | **4 (MIT)** | **4 (MIT)** | **4 (MIT)** | OM and OCC are AGPL-3.0 (viral copyleft risks for network services). MM, SVM, and MMCP are MIT (permissive, zero commercial/network friction). |
| **Composite Score (out of 52)** | **19** | **27** | **29** | **16** | **22** | **mimic-mcp (29)** and **OpenChatCut (27)** exhibit the highest technical implementation maturity in their domains. |

---

## 2. Machine-Readable Export
A machine-readable CSV version of this matrix is saved at `reel-engine-research/tables/master-feature-matrix.csv` and JSON at `reel-engine-research/tables/master-feature-matrix.json`.
