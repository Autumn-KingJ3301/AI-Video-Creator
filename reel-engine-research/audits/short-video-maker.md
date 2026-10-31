# Repository Audit: short-video-maker

## 1. Executive Verdict
`short-video-maker` is an end-to-end TypeScript web application and MCP service that produces vertical short-form videos for TikTok, Instagram Reels, and YouTube Shorts. Licensed under the permissive **MIT License**, it demonstrates a complete working pipeline connecting an LLM agent, Kokoro Text-to-Speech (TTS), Whisper transcription, Pexels stock video search, Remotion video composition, and a bundled React web UI. Its architecture is accessible and straightforward. However, it lacks robust production engineering: the render queue is a naive in-memory array (`queue = []`) with unhandled concurrency (`// todo add mutex lock`), jobs are lost on server restart, there are **no automated quality gates** (no safe area, no contrast, no static-frame limits), and it has no support for Manim. We recommend **reusing its React UI and Express/MCP router architecture as an engineering reference**, while replacing its queue and pipeline with Reel Engine's Scene IR and deterministic state machine.

---

## 2. Repository Snapshot

| Attribute | Verified Value |
|---|---|
| **Canonical URL** | `https://github.com/gyoridavid/short-video-maker` |
| **Pinned Commit SHA** | `9bb9a212ced86caa7e09099c382da1a44d638760` |
| **Commit Date** | 2025-06-21T13:17:09+02:00 |
| **Default Branch** | `main` |
| **License** | **MIT License** (`LICENSE`) |
| **Primary Languages** | TypeScript, React 18, HTML5 |
| **Runtimes & Frameworks** | Node.js, Express, Remotion, Vite, TailwindCSS |
| **Package Managers** | pnpm (`pnpm-lock.yaml`) |
| **Containerization** | Dockerfiles: `main.Dockerfile`, `main-cuda.Dockerfile`, `main-tiny.Dockerfile` |
| **Key Integrations** | Kokoro TTS, Whisper STT, Pexels API, FFmpeg |

---

## 3. Architecture Map

```
                  ┌────────────────────────────────────────┐
                  │ User Web UI (React) / MCP Client       │
                  └──────────────────┬─────────────────────┘
                                     │ (REST /api or MCP SSE)
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ src/server/server.ts (Express)         │
                  │ - APIRouter (/api)                     │
                  │ - MCPRouter (/mcp)                     │
                  │ - Static React Hosting (dist/ui)       │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ src/short-creator/ShortCreator.ts      │
                  │ In-memory FIFO queue (cuid tracking)   │
                  └──────────────────┬─────────────────────┘
                                     │
                ┌────────────────────┴────────────────────┐
                ▼                                         ▼
┌───────────────────────────────┐       ┌───────────────────────────────────┐
│ Audio & Transcription         │       │ Visual Assets & Stock Video       │
│ - Kokoro TTS (Voiceover)      │       │ - Pexels API (B-roll download)    │
│ - Whisper (Word Captions)     │       │ - MusicManager (Background audio) │
│ - FFmpeg (Audio Normalization)│       └─────────────────┬─────────────────┘
└───────────────┬───────────────┘                         │
                │                                         │
                └────────────────────┬────────────────────┘
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ Remotion Composition Engine            │
                  │ - src/components/videos/               │
                  │ - Remotion.renderMediaOnLambda/Local   │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ Final Render Output (.mp4)             │
                  └────────────────────────────────────────┘
```

---

## 4. Detailed Feature Table

| Feature ID | Feature / Behavior | Status | How it Works in Code | Source Evidence (`9bb9a2...`) | Test Evidence | Limitations / Risks | Reuse Potential |
|---|---|---|---|---|---|---|---|
| SVM-F01 | Express MCP & REST Server | **Implemented** | Hosts both REST endpoints and MCP router over SSE on a single port; serves compiled React frontend. | `src/server/server.ts:25-65`, `src/server/routers/mcp.ts` | Not run | Simple routing; lacks formal JSON-RPC session multiplexing. | **Adapt** (UI & MCP bridge) |
| SVM-F02 | Kokoro TTS Generation | **Implemented** | Synthesizes voiceover streams using Kokoro model (`af_heart` default). | `src/short-creator/libraries/Kokoro.ts:15-60` | `src/short-creator/ShortCreator.test.ts` | Local Kokoro runtime setup can be non-trivial; fallback needed. | **Adapt** |
| SVM-F03 | Whisper Word Captions | **Implemented** | Transcribes audio to generate word-level timestamp captions for Remotion subtitles. | `src/short-creator/libraries/Whisper.ts:12-55` | Not run | External binary or service dependency. | **Adapt** |
| SVM-F04 | Local React UI | **Implemented** | Full SPA providing video generation prompt form, video list, and preview player. | `src/ui/App.tsx`, `src/ui/pages/` | `npm run ui:build` | Built for simple prompt input; needs adaptation for phased Reel Engine director workflow. | **Adapt** (UI Foundation) |
| SVM-F05 | Docker Containerization | **Implemented** | CUDA, CPU, and Tiny Docker images for containerized video rendering. | `main-cuda.Dockerfile`, `main.Dockerfile` | Docker build definitions present | Large image sizes for CUDA; useful for cloud render workers. | **Adapt** (Worker container) |
| SVM-F06 | Job Queue & State | **Partial** | In-memory JavaScript array (`queue: []`); returns CUID tracking IDs. | `src/short-creator/ShortCreator.ts:40-75` | `src/short-creator/ShortCreator.test.ts` | **Critical flaw:** No disk persistence; unhandled race conditions (`// todo add mutex lock`). | **Replace** with SQLite/JSON state |
| SVM-F07 | Automated Quality Gates | **Absent** | No safe zone validation, no contrast checks, no visual change budget linter. | Codebase inspection | N/A | Generates video without verifying legibility or compliance. | **Must Build New** |
| SVM-F08 | Manim Support | **Absent** | No Python or Manim support. | Codebase inspection | N/A | Remotion only. | **None** |
| SVM-F09 | Non-destructive Edit List | **Absent** | Renders direct to final MP4; cannot trim, reorder, or toggle scenes post-production. | `src/short-creator/ShortCreator.ts:110-180` | N/A | Edits require full end-to-end re-render. | **Must Build New** |
| SVM-F10 | Phased MCP State Machine | **Absent** | Single-shot pipeline (`generate_short` tool); does not support `get_next_step` or phased director loop. | `src/server/routers/mcp.ts:15-45` | N/A | Violates Reel Engine phased doctrine. | **Must Build New** |

---

## 5. Representative Execution Trace
1. **Request Intake:** User posts prompt to `/api/generate` or calls MCP tool `create_short`.
2. **Queueing:** `ShortCreator.addToQueue()` pushes payload into `this.queue` and triggers `processQueue()`.
3. **Voiceover Synthesis:** Loops through `inputScenes`, calling `this.kokoro.generate(scene.text)`.
4. **Speech-to-Text:** `this.whisper.CreateCaption()` produces word timestamps from synthesized audio.
5. **Stock Asset Download:** `this.pexelsApi.findVideo()` queries Pexels and pipes HTTP response to temporary MP4 file.
6. **Muxing & Render:** `this.remotion.render()` compiles video scenes, overlays subtitles, and outputs final MP4.
7. **Status Polling:** Client polls `/api/status/:id` until file exists on disk.

---

## 6. Quality and Security Findings

### HIGH: Queue Data Loss & Concurrency Race
- **Location:** `src/short-creator/ShortCreator.ts:42, 60`.
- **Finding:** Code contains explicit comments: `// todo add mutex lock` and `// todo add a semaphore`.
- **Impact:** Server restart or crash completely wipes queued jobs; concurrent submissions can clobber temporary file paths.
- **Remediation:** Replace with SQLite-backed persistent state machine.

### HIGH: Unauthenticated Public API Exposure
- **Location:** `src/server/server.ts:38-42`.
- **Finding:** No authentication or rate limiting on `/api` or `/mcp` endpoints by default.
- **Remediation:** Bind to `localhost` by default; implement bearer token auth for remote access.

### MEDIUM: Flaky Stock Video Piping
- **Location:** `src/short-creator/ShortCreator.ts:165-185`.
- **Finding:** Direct HTTP piping from Pexels CDN to disk with rudimentary unlink error handlers. Network interruption leaves orphaned temporary files.

---

## 7. Test and CI Assessment
- **Observed Tests:** Only 2 test files (`ShortCreator.test.ts`, `music.test.ts`) using Vitest.
- **Test Quality:** Minimal test coverage; heavily mocks Remotion and external APIs; no integration tests for MCP protocol or UI components.

---

## 8. Reusability Analysis
- **Candidate Modules:**
  1. `src/server/server.ts`: Clean pattern for serving both MCP SSE and React SPA on one port.
  2. `src/ui/`: React + Vite SPA structure for local video engine control panel.
  3. `main-cuda.Dockerfile`: Base configuration for containerized GPU FFmpeg and Remotion rendering.
- **Extraction Effort:** Low; MIT licensed and modular.

---

## 9. Known Unknowns
- Kokoro TTS runtime performance and voice naturalness on AMD/Intel CPUs compared to cloud TTS (ElevenLabs).

---

## 10. Recommendation: Adapt UI & MCP Server Skeleton (MIT)
**Verdict: Useful for Local UI and Express MCP Server Scaffolding.**
`short-video-maker` provides an MIT-licensed blueprint for hosting a local web UI and MCP server in a single Node.js process. However, its core generation pipeline, in-memory queue, and complete lack of QA checks must be replaced by Reel Engine's robust, phased architecture.
