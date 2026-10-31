# Technology and Risk Matrix

A rigorous cross-comparison of architectures, runtime dependencies, quality enforcement, and operational risks across all five audited repositories.

---

## 1. Core Technology Stack Comparison

| Repository | Primary Language | Rendering Engines | MCP Architecture | UI Framework | Job Queue & State Storage | Audio Pipeline (STT/TTS) | License |
|---|---|---|---|---|---|---|---|
| **OpenMontage** | Python 3.11+ & TypeScript | Remotion 4.0.484 (Node) | None (CLI / direct Python imports) | Backlot (FastAPI + HTML storyboard) | Filesystem JSON checkpoints (`lib/checkpoint.py`) | ElevenLabs, Google Vertex, Whisper | **AGPL-3.0** |
| **OpenChatCut** | TypeScript (ESM) & React | Remotion (Node Worker, NVENC/Toolbox) | In-process MCP server & client (`server/agent-runs/`) | Full desktop NLE (Electron + Vite + React 18) | In-memory with recovery ledger & draft stores | Whisper CLI sync (`sync-whisper-cli.mjs`) | **AGPL-3.0-or-later** |
| **mimic-mcp** | TypeScript (Node ESM) | Remotion (CLI / headless bundle) | MCP Server (`src/index.ts` via Stdio) | None (links to Remotion Studio) | Stateless per-tool invocation | Whisper & Aubio (beat detection) | **MIT** |
| **short-video-maker** | TypeScript & React | Remotion (Local / Lambda) | Express router (`/mcp` SSE endpoint) | React 18 SPA (`src/ui/App.tsx`, Vite, Tailwind) | In-memory array (`queue: []`); no persistence | Kokoro TTS & Whisper | **MIT** |
| **manim-mcp** | Python 3.11+ | ManimGL & Manim CE (Subprocess) | FastMCP (`mcp.server.fastmcp`) with SSE | SSE progress endpoint (`/progress/{id}`) | SQLite Tracker (`manim_mcp/core/tracker.py`) | Basic local TTS (`core/tts.py`) | **MIT** |

---

## 2. Quality and Security Rigor Comparison

| Repository | Code Execution Sandboxing | Quality Gate Enforcement Model | Test Maturity & Test Suite Size | Failure Handling & Recovery | Deterministic Rendering Controls |
|---|---|---|---|---|---|
| **OpenMontage** | Low (relies on network guard and provider sandboxes) | **Blocking pre-flight gates** (`slideshow_risk.py` halts on verdict `fail`) | Medium (32 pytest files; cloud API mock reliance) | Resumes via stage checkpoints in `pipeline/` | Pinned Remotion dependencies; random seeds in scripts |
| **OpenChatCut** | Medium (task admission limiters; no AST code filter) | **Explicitly Advisory Only** (`sceneQuality.ts:1` has no runtime enforcement) | **Very High** (Over 120 dedicated `*.verify.ts` co-located suites) | Transactional timeline deltas and rollback actions | Hardware encoder fallback; AAC priming compensation |
| **mimic-mcp** | Low (assumes trusted environment; standard Node execution) | **Strict Numerical QA** (pure math functions for -14 LUFS, safe-area, contrast) | **High** (28 isolated Vitest suites with unit fixtures) | Returns error JSON to agent; no background queue | Deterministic raster stats and loudnorm JSON parsing |
| **short-video-maker** | None (runs arbitrary prompts and downloads video URLs) | **Absent** (No automated safe area, contrast, or pacing checks) | Minimal (2 test files in Vitest; heavily mocked) | Failed jobs stay in `failed` state; no restart recovery | Relies on Remotion default rendering |
| **manim-mcp** | **High** (AST visitor blocks 26 modules, builtins, and dunders) | **AST Syntax & Rule Gates** (Rejects unsafe or malformed Python) | **High** (8 pytest suites testing AST attacks and renderer) | Background task registry with timeout kills | Pinned rendering parameters; isolated temp directories |

---

## 3. Notable Code Defects and Unsupported README Claims

1. **OpenChatCut: Advisory Quality Gate Disconnect**
   - *Claim / Impression:* README implies automated AI video quality assurance and validation.
   - *Verified Code:* `src/agent/sceneQuality.ts:1` explicitly comments: `// Pure advisory review for multi-scene plans. The report has no runtime enforcement role.` The report is delivered as context advice to the agent and **never blocks compilation or export**.
2. **short-video-maker: Concurrency and Persistence Failure**
   - *Claim:* "Production-ready short video maker service with MCP".
   - *Verified Code:* `src/short-creator/ShortCreator.ts:42,60` relies on an in-memory `private queue = []` with unresolved concurrency: `// todo add mutex lock`, `// todo add a semaphore`. Any crash or process restart permanently drops all active render jobs.
3. **OpenMontage: High Cloud Lock-in and AGPL Scope**
   - *Claim:* Open autonomous director engine for explainer videos.
   - *Verified Code:* Deeply coupled to proprietary cloud providers (Google Vertex, OpenAI Sora 2, Fal.ai) requiring multiple paid API keys. Its AGPL-3.0 license makes it legally risky for SaaS deployment without full source disclosure.
4. **mimic-mcp: Fixed Heuristic Safe Zones**
   - *Claim:* Universal safe area checking for social platforms.
   - *Verified Code:* `src/safe-area.ts` relies on static hardcoded percentage boxes (`rect: { x: 0.84, y: 0.46, w: 0.16, h: 0.4 }`). If Instagram shifts its action rail or font size, the check will yield false positives or false negatives unless updated.
5. **manim-mcp: Missing Vertical Canvas Support**
   - *Claim:* Complete text-to-video pipeline for animation.
   - *Verified Code:* While resolution can be set to `1080x1920`, ManimGL camera frames and internal coordinate systems default to 16:9 widescreen, requiring manual mathematical camera re-centering for 9:16 vertical reels.
