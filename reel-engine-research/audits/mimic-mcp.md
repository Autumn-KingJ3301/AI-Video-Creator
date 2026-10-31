# Repository Audit: mimic-mcp

## 1. Executive Verdict
`mimic-mcp` (`mimic-reels-mcp`) is a focused, highly relevant TypeScript MCP server that recreates short-form vertical videos using Remotion. Licensed under the permissive **MIT License**, it contains the most directly applicable quality gates and vertical video domain logic among all five repositories: precise platform safe-zone bounding box collision checks (`src/safe-area.ts`), frame raster brightness/contrast/detail analysis (`src/frame-quality.ts`), exact `-14 LUFS` EBU R128 loudness normalization (`src/loudness.ts`), and Zod-based preset schemas (`src/presets.ts`). Its primary limitation is that it was designed to clone the style of an existing reference video via OCR and audio feature extraction, rather than autonomously directing a video from an original text brief. It also lacks Manim integration. We recommend **adopting mimic-mcp as a primary architectural and component donor** for Reel Engine's Remotion helpers, audio QA, and safe-zone gates.

---

## 2. Repository Snapshot

| Attribute | Verified Value |
|---|---|
| **Canonical URL** | `https://github.com/pouyashahrdami/mimic-mcp` |
| **Pinned Commit SHA** | `9dca836c78ac06d0a244364d878d7c9dfb44ca16` |
| **Commit Date** | 2026-08-31T14:49:05-04:00 |
| **Default Branch** | `main` |
| **License** | **MIT License** (`LICENSE`) |
| **Primary Languages** | TypeScript (ESM), Node.js |
| **Runtimes & Frameworks** | Node.js, Remotion, Vitest, Zod, Aubio, Whisper |
| **Package Managers** | pnpm (`packageManager: pnpm@11.18.0`, `pnpm-lock.yaml`) |
| **Submodules / LFS** | None |
| **Native Tools** | FFmpeg, Aubio (beat detection), Tesseract/Vision OCR |

---

## 3. Architecture Map

```
                  ┌────────────────────────────────────────┐
                  │ MCP Client (Antigravity / Claude Code) │
                  └──────────────────┬─────────────────────┘
                                     │ (Model Context Protocol)
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ src/index.ts & src/tools/              │
                  │ - tool: scaffold_reel                  │
                  │ - tool: render_reel                    │
                  │ - tool: critique                       │
                  └──────────────────┬─────────────────────┘
                                     │
                ┌────────────────────┴────────────────────┐
                ▼                                         ▼
┌───────────────────────────────┐       ┌───────────────────────────────────┐
│ Analysis & Style Presets      │       │ Automated QA Gates                │
│ - src/presets.ts (Zod schema) │       │ - src/safe-area.ts (Platform UI)  │
│ - src/captions.ts (OCR / Box) │       │ - src/frame-quality.ts (Contrast) │
│ - src/beats.ts (Aubio beats)  │       │ - src/loudness.ts (-14 LUFS gate) │
│ - src/draft-recipe.ts         │       │ - src/motion.ts (optical flow)    │
└───────────────┬───────────────┘       └─────────────────┬─────────────────┘
                │                                         │
                └────────────────────┬────────────────────┘
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ templates/remotion/ (Composition)      │
                  │ Remotion bundle rendering engine       │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ FFmpeg Two-Pass Loudnorm & Export      │
                  └────────────────────────────────────────┘
```

---

## 4. Detailed Feature Table

| Feature ID | Feature / Behavior | Status | How it Works in Code | Source Evidence (`9dca83...`) | Test Evidence | Limitations / Risks | Reuse Potential |
|---|---|---|---|---|---|---|---|
| MM-F01 | Safe Area Collision Checker | **Implemented** | Models Instagram Reels & TikTok UI overlays as normalized rectangles; calculates bounding box overlap against caption/key events. | `src/safe-area.ts:25-95` | `src/safe-area.test.ts` (Vitest) | Hardcoded platform rects; requires periodic review as platform UI evolves. | **Reuse As-Is / Direct Adapt** |
| MM-F02 | Frame Quality Raster Analysis | **Implemented** | Decodes raw grayscale frame buffers; computes brightness, contrast (luma standard deviation), and detail gradient magnitude. | `src/frame-quality.ts:20-75` | `src/frame-quality.test.ts` | Operates on raw byte buffers; requires extracted frame images. | **Reuse As-Is** |
| MM-F03 | Two-Pass Loudness Normalization | **Implemented** | Parses FFmpeg `loudnorm` filter JSON output; validates `-14 LUFS` integrated loudness and `-1 dBTP` true-peak ceiling. | `src/loudness.ts:15-85` | `src/loudness.test.ts` | Requires FFmpeg binary available in execution path. | **Reuse As-Is** |
| MM-F04 | Preset Schema & Validation | **Implemented** | Zod schemas defining segment duration, caption animations (karaoke, typewriter), typography, and zoom easing. | `src/presets.ts:18-85` | `src/presets.test.ts` | Tailored to "recreation recipe" rather than Reel Engine Scene IR. | **Adapt** |
| MM-F05 | Caption Event Extraction | **Implemented** | Aggregates word bounding boxes into multi-line caption events with vertical band tags (`top`, `center`, `bottom`). | `src/captions.ts:30-110` | `src/captions.test.ts` | Assumes OCR input from reference frames; easily adapted to Whisper words. | **Adapt** |
| MM-F06 | Audio Beat Snapping | **Implemented** | Uses Aubio library to detect audio onset and rhythm beats for transition alignment. | `src/aubio.ts:10-55`, `src/beats.test.ts` | `src/beats.test.ts` | External Aubio C/wasm dependency. | **Adapt** (Optional) |
| MM-F07 | Remotion Rendering Execution | **Implemented** | Bundles templates and invokes Remotion headless renderer with progress tracking. | `src/render-reel.test.ts`, `templates/remotion` | `src/render-reel.test.ts` | Tightly coupled to template project structure. | **Adapt** |
| MM-F08 | Manim Integration | **Absent** | No Manim renderer or mathematical scene support. | Repository scan | N/A | Remotion only. | **None** |
| MM-F09 | Strict Phased State Machine | **Partial** | Provides MCP tools (`critique`, `scaffold_reel`, `render_reel`), but lacks strict legal phase gates and `get_next_step`. | `src/index.ts:35-120` | `src/recipe.test.ts` | Agent can call tools out of order. | **Adapt** |
| MM-F10 | Visual Change Budget Linter | **Absent** | No explicit check that a visual event occurs every 1.5 to 3.0 seconds. | Repository scan | N/A | Does not enforce Reel Engine Doctrine Rule 4. | **Must Build New** |

---

## 5. Representative Execution Trace
1. **Tool Call:** Agent invokes `scaffold_reel` with reference media or target preset.
2. **Audio Analysis:** `src/aubio.ts` detects audio beats; `src/whisper.ts` transcribes words.
3. **Recipe Construction:** `src/draft-recipe.ts` generates structured recipe matching `src/presets.ts` Zod schema.
4. **Remotion Render:** `templates/remotion` renders intermediate video.
5. **Quality Gate Execution:**
   - `src/safe-area.ts:checkSafeArea()` detects UI bounding box collisions.
   - `src/frame-quality.ts:frameStats()` checks contrast and exposure.
   - `src/loudness.ts:parseLoudnorm()` validates -14 LUFS ceiling.
6. **Critique Tool:** `src/critique.ts` aggregates findings and returns status report to the agent.

---

## 6. Quality and Security Findings

### LOW / POSITIVE: MIT License Compatibility
- **Location:** `LICENSE`.
- **Finding:** Fully permissive MIT license with zero copyleft restrictions. Safe for proprietary or commercial incorporation.

### MEDIUM: External Dependency on Native Tools
- **Location:** `src/ffmpeg.ts` and `src/aubio.ts`.
- **Finding:** Direct shell invocation of system binaries without bundled fallback.
- **Risk:** Fails if `ffmpeg` or `aubio` are missing from the system environment.

### LOW: Unbounded Recipe File Input
- **Location:** `src/recipe.ts:parseRecipe()`.
- **Finding:** Reads recipe JSON files from arbitrary paths without strict sandboxing.
- **Remediation:** Enforce project-root jail on all file reads.

---

## 7. Test and CI Assessment
- **Observed Tests:** 28 test suites in `src/*.test.ts` using Vitest.
- **Quality:** High unit test isolation; extensive mock fixtures (`test-fixtures.ts`); fast execution.
- **Coverage:** Excellent coverage of pure logic (loudness parsing, safe-area math, frame statistics, Zod validation).

---

## 8. Reusability Analysis
- **Candidate Modules (Highest Reuse Value):**
  1. `src/safe-area.ts`: Direct reuse for Reel Engine Safe Area QA gate.
  2. `src/frame-quality.ts`: Direct reuse for Reel Engine Contrast and Frame Quality gate.
  3. `src/loudness.ts`: Direct reuse for Reel Engine -14 LUFS Audio Loudness gate.
  4. `src/presets.ts`: Schema patterns for preset segment timing.
- **Extraction Effort:** Very low (clean ESM TypeScript with zero heavy framework coupling).

---

## 9. Known Unknowns
- How well the heuristic frame brightness/contrast metrics perform across diverse animated Manim scenes vs live-action video.

---

## 10. Recommendation: Adopt Key Modules (MIT)
**Verdict: Strong Candidate for Direct Component Reuse.**
`mimic-mcp` is an outstanding source of tested, MIT-licensed TypeScript implementations of Reel Engine's core automated QA gates (Safe Zone, Frame Quality, Loudness). It should be directly incorporated into Reel Engine's quality verification subsystem.
