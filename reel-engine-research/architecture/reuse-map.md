# Code Reuse and Adaptation Map

This document defines the exact software components selected for reuse, adaptation, or cleanroom extraction from the audited repositories, detailing original modules, target interfaces, refactoring requirements, estimated complexity, and fallback behaviors.

---

## 1. Selected Component Mappings

### Component 1: AST Code Security Sandbox
- **Source Repository & Module:** `manim-mcp` — `manim_mcp/core/sandbox.py:CodeSandbox`
- **Target Subsystem:** `reel-engine/workers/manim/sandbox.py`
- **License:** MIT (Permissive). Direct vendor copy.
- **Original Dependencies:** Standard library `ast`, `typing`. Zero external dependencies.
- **Proposed Interface:**
  ```python
  class CodeSandbox:
      def validate(self, code: str) -> ValidationResult: ...
  ```
- **Mapping to Reel Engine:** Called during `authored -> rendered` transition before executing any agent-authored Python Manim script.
- **Estimated Complexity:** **S** (Small).
- **Failure Modes & Fallback:** If code contains blocked modules or syntax errors, returns immediate blocking validation error with line and column numbers. Does not execute subprocess.
- **Test Strategy:** Port `tests/test_sandbox.py` directly; test 26 blocked modules and exploit vectors.

---

### Component 2: Safe Area & Crop Collision Checker
- **Source Repository & Module:** `mimic-mcp` — `src/safe-area.ts:checkSafeArea`
- **Target Subsystem:** `reel-engine/qa/safe-area-gate.ts`
- **License:** MIT (Permissive). Direct vendor copy.
- **Original Dependencies:** Pure TypeScript. Zero external dependencies.
- **Proposed Interface:**
  ```typescript
  export interface Rect { x: number; y: number; w: number; h: number; }
  export function checkSafeArea(elements: { id: string; rect: Rect }[], platform = "instagram"): SafeCheckResult;
  ```
- **Mapping to Reel Engine:** Validates text bounding boxes reported by Remotion/Manim layout helpers against Instagram Reels margins (top 14%, bottom 35%, side 6%) and 3:4 center crop.
- **Estimated Complexity:** **S** (Small).
- **Failure Modes & Fallback:** Hard blocking gate. If any text element overlaps an unsafe region, blocks `verified` phase transition and returns offending element ID, bounding box, and overlay name.

---

### Component 3: Two-Pass Audio Loudness Normalizer (-14 LUFS)
- **Source Repository & Module:** `mimic-mcp` — `src/loudness.ts:parseLoudnorm`
- **Target Subsystem:** `reel-engine/audio/loudness.ts`
- **License:** MIT (Permissive). Direct vendor copy.
- **Original Dependencies:** Pure TypeScript string parsing; expects FFmpeg `loudnorm` pass 1 stderr output.
- **Proposed Interface:**
  ```typescript
  export function parseLoudnorm(stderr: string): LoudnessMeasurement;
  export function buildLoudnormFilter(measurement: LoudnessMeasurement, targetLufs = -14): string;
  ```
- **Mapping to Reel Engine:** Used in Phase D to verify narration track loudness and Phase E during final FFmpeg composition.
- **Estimated Complexity:** **S** (Small).
- **Failure Modes & Fallback:** If pass 1 stderr contains no JSON or digital silence (`-inf`), flags audio error. Falls back to linear volume adjustment if two-pass filter fails.

---

### Component 4: Grayscale Frame Quality & Contrast Analyzer
- **Source Repository & Module:** `mimic-mcp` — `src/frame-quality.ts:frameStats`
- **Target Subsystem:** `reel-engine/qa/frame-contrast.ts`
- **License:** MIT (Permissive). Direct vendor copy.
- **Original Dependencies:** `src/framing.ts` (Sobel gradient math). Pure TypeScript on `Uint8Array`.
- **Proposed Interface:**
  ```typescript
  export function frameStats(rawGrayscaleBuffer: Uint8Array, width: number, height: number): FrameStats;
  ```
- **Mapping to Reel Engine:** Inspects sampled frames from rendered scene clips to detect washed-out frames, black frames, and low-contrast text overlays.
- **Estimated Complexity:** **S** (Small).
- **Failure Modes & Fallback:** Returns structured brightness, contrast, and detail metrics. Flags blocking violation if contrast < threshold in text regions.

---

### Component 5: Async Manim Rendering Pipeline
- **Source Repository & Module:** `manim-mcp` — `manim_mcp/core/renderer.py` & `core/code_bridge.py`
- **Target Subsystem:** `reel-engine/workers/manim/renderer.py`
- **License:** MIT (Permissive).
- **Original Dependencies:** Python 3.11+, `manimgl` or `manim`, `asyncio`.
- **Proposed Interface:**
  ```python
  async def render_scene_clip(code: str, scene_id: str, duration_frames: int, fps: int = 30) -> RenderClipResult: ...
  ```
- **Mapping to Reel Engine:** Executes validated Manim Python code in an isolated subprocess; renders vertical 9:16 MP4 clip; verifies output frame count.
- **Estimated Complexity:** **M** (Medium).
- **Failure Modes & Fallback:** Process timeout watchdog (`RenderTimeoutError`), file size limits, stdout/stderr traceback capture returned to MCP agent.

---

### Component 6: Unified Express MCP & Static Web UI Server
- **Source Repository & Module:** `short-video-maker` — `src/server/server.ts` & `src/ui/`
- **Target Subsystem:** `reel-engine/server/` & `reel-engine/ui/`
- **License:** MIT (Permissive).
- **Original Dependencies:** Express, Vite, React 18, TailwindCSS.
- **Proposed Interface:**
  - REST endpoints: `/api/project`, `/api/scenes`, `/api/preview/:id`
  - MCP endpoints: `/mcp` (SSE and POST JSON-RPC)
  - Static app: `/*` serves compiled React SPA
- **Mapping to Reel Engine:** Hosts the local user interface and Model Context Protocol server on a single local port (`http://localhost:3000`).
- **Estimated Complexity:** **M** (Medium).
- **Failure Modes & Fallback:** If UI client disconnects, MCP server continues background renders uninterrupted.

---

### Component 7: Monotony & Slideshow Risk Scoring (Cleanroom)
- **Source Repository & Module:** `OpenMontage` — `lib/slideshow_risk.py:score_slideshow_risk`
- **Target Subsystem:** `reel-engine/qa/slideshow-risk.ts`
- **License:** Original is AGPL-3.0. **Must be cleanroom implemented in TypeScript under MIT.**
- **Proposed Interface:**
  ```typescript
  export interface SlideshowRiskReport {
      score: number; // 0..5
      verdict: "strong" | "acceptable" | "revise" | "fail";
      dimensions: Record<string, { score: number; reason: string }>;
  }
  export function scoreSlideshowRisk(scenes: SceneIR[]): SlideshowRiskReport;
  ```
- **Mapping to Reel Engine:** Runs during `submit_plan` and `inspect` to catch visual monotony and repetitive layouts.
- **Estimated Complexity:** **M** (Medium).

---

### Component 8: Hardware Acceleration Probe (Cleanroom)
- **Source Repository & Module:** `OpenChatCut` — `server/media-acceleration.ts`
- **Target Subsystem:** `reel-engine/media/hardware-probe.ts`
- **License:** Original is AGPL-3.0. **Cleanroom implemented in TypeScript under MIT.**
- **Proposed Interface:**
  ```typescript
  export function resolveH264Encoder(): { id: string; name: string; isHardware: boolean };
  ```
- **Mapping to Reel Engine:** Probes `ffmpeg -encoders` for `h264_nvenc` (NVIDIA), `h264_videotoolbox` (macOS), `h264_qsv` (Intel), falling back to `libx264`.
- **Estimated Complexity:** **S** (Small).
