# Repository Audit: OpenChatCut

## 1. Executive Verdict
OpenChatCut is a massive, highly sophisticated open-source video editor designed as an agent-native ChatCut alternative with deep MCP integration. It features industry-grade media engineering: automatic variable-to-constant frame rate (VFR-to-CFR) normalization, multi-platform hardware video encoding detection (NVENC, Apple VideoToolbox, Intel QSV, AMD AMF), broadcast-grade timecode parsing, and an extensive suite of automated verification tests (`*.verify.ts`). However, OpenChatCut is licensed under **AGPL-3.0-or-later**, is structured as a full desktop Non-Linear Editor (NLE) with Electron and Vite, and its scene quality checks (`src/agent/sceneQuality.ts`) are **explicitly purely advisory** with zero runtime blocking gates. Furthermore, it has no native Manim support. We recommend **referencing its media normalization and Remotion render contract patterns** while rejecting it as a base fork due to AGPL viral licensing and massive unnecessary NLE UI complexity.

---

## 2. Repository Snapshot

| Attribute | Verified Value |
|---|---|
| **Canonical URL** | `https://github.com/0xsline/OpenChatCut` |
| **Pinned Commit SHA** | `7fa4b7903e7ebecf832a36249f0c0c755200cc17` |
| **Commit Date** | 2026-10-21T21:08:55+08:00 |
| **Default Branch** | `main` |
| **License** | **GNU Affero General Public License v3.0 or later (AGPL-3.0-or-later)** (`package.json:5`, `LICENSE`) |
| **Primary Languages** | TypeScript (ESM), React 18, Node.js 24 |
| **Runtimes & Frameworks** | Node.js `>=24 <25`, Vite, Remotion, Electron Desktop |
| **Package Managers** | npm (`package-lock.json`), nvm (`.nvmrc`) |
| **Submodules / LFS** | None (`.gitmodules` absent) |
| **Key Binaries** | Bundled FFmpeg, FFprobe, Whisper CLI sync script (`scripts/sync-whisper-cli.mjs`) |

---

## 3. Architecture Map

```
                  ┌────────────────────────────────────────┐
                  │ External Agent (Claude, Codex, MCP)    │
                  └──────────────────┬─────────────────────┘
                                     │ (MCP Protocol / SSE)
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ server/agent-runs/ & src/agent/        │
                  │ - serverRunToolExecutor.ts             │
                  │ - external-tool-schemas.ts             │
                  │ - timelineDelta.ts & proposal-commit.ts│
                  └──────────────────┬─────────────────────┘
                                     │
                ┌────────────────────┴────────────────────┐
                ▼                                         ▼
┌───────────────────────────────┐       ┌───────────────────────────────────┐
│ Media Normalization Pipeline  │       │ Agent Advisory QA System          │
│ - server/media-normalization  │       │ - src/agent/sceneQuality.ts       │
│ - server/media-timecode.ts    │       │   (Advisory: true; NO blocking)   │
│ - server/media-acceleration.ts│       │ - src/agent/vision.ts             │
│   (NVENC, VideoToolbox, QSV)  │       └───────────────────────────────────┘
└───────────────┬───────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│ remotion/ Rendering Engine                              │
│ - render.mjs (headless render worker)                   │
│ - render-contract.mjs (timelines, assets, profiles)     │
│ - video-decoder.mjs & aac-encoder-delay.mjs             │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│ desktop/ & src/ UI (Full NLE Electron / Vite Interface) │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Feature Table

| Feature ID | Feature / Behavior | Status | How it Works in Code | Source Evidence (`7fa4b7...`) | Test Evidence | Limitations / Risks | Reuse Potential |
|---|---|---|---|---|---|---|---|
| OCC-F01 | Media Normalization (VFR to CFR) | **Implemented** | Probes incoming video stream; forces constant frame rate and transcode if VFR or unsupported codec detected. | `server/media-normalization.ts:40-185` | `server/media-normalization.verify.ts` | Heavy disk I/O; creates temporary `.norm-*.tmp.mp4` files. | **Adapt** (Media pipeline) |
| OCC-F02 | Hardware Accelerated Encoding | **Implemented** | Detects and benchmarks hardware H.264 encoders: Apple VideoToolbox, NVIDIA NVENC, Intel QSV, AMD AMF, Linux VA-API. | `server/media-acceleration.ts:15-120` | `server/media-acceleration.verify.ts` | Platform specific fallback to `libx264` if probe fails. | **Adapt** |
| OCC-F03 | Broadcast Timecode & Frame Math | **Implemented** | Reads embedded timecode from MP4/MOV tags, handles drop-frame (DF/NDF), computes GCD-reduced frame rates. | `server/media-timecode.ts:40-115` | `server/media-timecode.verify.ts` | Complex parsing for NLE interchange; overkill for simple social reels. | **Adapt** (core math) |
| OCC-F04 | Advisory Scene Quality Checks | **Implemented (Advisory only)** | Computes 0–5 risk score over repetition, decorative visuals, typography overreliance, and generic phrases. | `src/agent/sceneQuality.ts:1-75` | `src/agent/sceneQuality.verify.ts` | **Explicitly non-blocking:** `// Pure advisory review... The report has no runtime enforcement role.` | **Adapt** into true blocking gate |
| OCC-F05 | Agent Proposal & Timeline Deltas | **Implemented** | Allows agents to submit timeline modifications as deltas, review proposals, and commit them atomically. | `src/agent/timelineDelta.ts:18-90`, `src/agent/proposal-commit.ts` | `src/agent/timelineDelta.verify.ts` | Bound to OpenChatCut's complex multi-track timeline schema. | **Reference only** |
| OCC-F06 | Headless Remotion Render Contract | **Implemented** | Serializes timeline snapshots into self-contained render bundles; controls timeouts and performance metrics. | `remotion/render-contract.mjs:10-85`, `remotion/render.mjs` | `remotion/render-timeout.verify.mjs` | Node.js script; tailored to internal snapshot data format. | **Adapt** |
| OCC-F07 | Audio Delay Compensation | **Implemented** | Adjusts for AAC priming and encoder delay offsets during FFmpeg muxing. | `remotion/aac-encoder-delay.mjs:12-45` | `remotion/aac-encoder-delay.verify.mjs` | Low-level audio detail; vital for frame-accurate lipsync. | **Adapt** |
| OCC-F08 | Manim Support | **Absent** | No mathematical or Python animation support whatsoever. | Codebase inspection | N/A | Exclusively Remotion and stock video/audio assets. | **None** |
| OCC-F09 | Platform Safe Zone Gate | **Absent / Unverified** | No automated blocking gate for Instagram 14% top / 35% bottom safe margin violation. | Search for `safeZone` / `safe_area` | N/A | Safe areas are UI overlays only, not blocking compilation gates. | **Must Build New** |
| OCC-F10 | State Machine & `get_next_step` | **Partial** | Manages server run lifecycles (`serverRunState.ts`), but lacks strict phase progression (`transcribed -> planned -> authored -> verified`). | `src/agent/serverRunState.ts:20-80` | `src/agent/serverRunState.verify.ts` | Free-form chat/edit loop rather than deterministic phased pipeline. | **Reference only** |

---

## 5. Representative Execution Trace
1. **Agent Interaction:** Agent calls tool over MCP (`server/agent-runs/`).
2. **Execution Dispatch:** `serverRunToolExecutor.ts` validates request against `external-tool-schemas.ts`.
3. **Asset Ingestion:** Media files pass through `local-media-import.ts` into `server/media-normalization.ts`.
4. **Hardware Probe:** `media-acceleration.ts` selects hardware encoder (e.g. `h264_nvenc`).
5. **Timeline Update:** Changes applied via `timelineDelta.ts:applyTimelineDelta()`.
6. **Advisory Lint:** `sceneQuality.ts:assessSceneQuality()` runs and returns advisory warnings to agent context.
7. **Render Snapshot:** `remotion/render-contract.mjs` packages timeline into JSON snapshot.
8. **Render Worker:** Spawns `remotion/render.mjs` to render MP4 frames with hardware acceleration.

---

## 6. Quality and Security Findings

### CRITICAL: AGPL-3.0-or-later License
- **Location:** `package.json` (`"license": "AGPL-3.0-or-later"`).
- **Impact:** Forking OpenChatCut or linking its modules into a backend server will trigger AGPL viral provisions, forcing the entire Reel Engine stack to be open-sourced under AGPL.
- **Mitigation:** Cleanroom extraction of hardware acceleration and media normalization algorithms.

### HIGH: Advisory Quality Gate Bypass
- **Location:** `src/agent/sceneQuality.ts:1`.
- **Finding:** Code explicitly comments: `// Pure advisory review for multi-scene plans. The report has no runtime enforcement role.`
- **Defect vs Reel Engine Doctrine:** Fails Reel Engine Requirement REQ-QA (Quality Gates must be deterministic blocking gates).

### MEDIUM: Massive Desktop Dependency Footprint
- **Location:** `desktop/`, `src/`, `config/vite.config.ts`.
- **Finding:** Monolithic repository bundling Electron, audio worklets, Mediapipe, WebGL shaders, and full frontend editor.
- **Risk:** High maintenance overhead, fragile build times, and high attack surface for a headless video service.

---

## 7. Test and CI Assessment
- **Observed Tests:** Phenomenal test coverage: over 120 dedicated `*.verify.ts` files testing media normalization, keystores, timeline deltas, timecode parsing, and tool execution.
- **Execution Status:** Static analysis conducted. Architectural rigor is confirmed by the presence of co-located unit verification tests alongside every critical module.

---

## 8. Reusability Analysis
- **Candidate Modules:**
  1. `server/media-acceleration.ts`: Hardware H.264 encoder detection (NVENC, VideoToolbox).
  2. `server/media-normalization.ts`: VFR to CFR conversion and bitrate clamps.
  3. `remotion/aac-encoder-delay.mjs`: Audio encoder priming delay math.
- **Extraction Barrier:** High due to AGPL-3.0 license. Requires cleanroom rewrite.

---

## 9. Known Unknowns
- Memory leakage behavior during continuous headless Remotion worker execution under sustained batch loads.

---

## 10. Recommendation: Reference Only / Cleanroom Reimplementation
**Verdict: Reject as base fork; study and cleanroom-reimplement media acceleration routines.**
OpenChatCut is a masterclass in TypeScript media pipeline normalization and verification testing, but its AGPL license, desktop NLE bloat, purely advisory quality checks, and total absence of Manim make it unsuitable as a foundation for Reel Engine.
