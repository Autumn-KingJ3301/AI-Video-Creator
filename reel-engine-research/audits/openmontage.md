# Repository Audit: OpenMontage

## 1. Executive Verdict
OpenMontage is an ambitious Python and TypeScript/Remotion video production framework designed for autonomous agents producing multi-scene explainer videos. Its greatest strength lies in its domain models for video quality: it explicitly formalizes heuristics against boring "slideshow" videos (`slideshow_risk.py`), validates scene pacing against speech landmarks (`verify_scene_pacing.py`), and enforces delivery promises (`delivery_promise.py`). However, OpenMontage is licensed under the **GNU Affero General Public License v3 (AGPL-3.0)**, which imposes strict copyleft obligations on network services and derivative engines. Architecturally, it is tightly coupled to cloud AI providers (OpenAI Sora 2, Google Vertex/GenAI, ElevenLabs, Fal) and lacks an integrated Model Context Protocol (MCP) server interface. We recommend **adapting its pacing math and slideshow risk algorithms via cleanroom design or permissive extraction**, while rejecting the overall framework as a primary codebase for Reel Engine.

---

## 2. Repository Snapshot

| Attribute | Verified Value |
|---|---|
| **Canonical URL** | `https://github.com/calesthio/OpenMontage` |
| **Pinned Commit SHA** | `195eab24478dc9363326aec437aefc3701635ddf` |
| **Commit Date** | 2026-10-28T14:45:26-07:00 |
| **Default Branch** | `main` |
| **License** | **GNU Affero General Public License v3.0 (AGPL-3.0)** (`LICENSE`) |
| **Primary Languages** | Python 3.11+, TypeScript, React |
| **Runtimes & Frameworks** | FastAPI, Uvicorn, Remotion 4.0.484, Pydantic v2 |
| **Package Managers** | pip (`requirements.txt`), npm (`remotion-composer/package.json`) |
| **Submodules / LFS** | None (`.gitmodules` absent; `.gitattributes` defines standard text attributes) |
| **External Dependencies** | FFmpeg, Google Vertex AI / GenAI, OpenAI, Anthropic, Fal.ai |

---

## 3. Architecture Map

```
                  ┌────────────────────────────────────────┐
                  │ Agent / User Prompt / Script Input      │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ lib/pipeline_loader.py & config.yaml   │
                  │ (Pydantic models, Provider Routing)    │
                  └──────────────────┬─────────────────────┘
                                     │
                ┌────────────────────┴────────────────────┐
                ▼                                         ▼
┌───────────────────────────────┐       ┌───────────────────────────────────┐
│ Heuristic Pre-flight QA Checks│       │ Asset Generation & Tool Routing   │
│ - lib/slideshow_risk.py       │       │ - tools/audio (ElevenLabs / TTS)  │
│ - lib/verify_scene_pacing.py  │       │ - tools/video (Sora / Fal / Kling)│
│ - lib/variation_checker.py    │       │ - tools/subtitle (Whisper)        │
│ - lib/delivery_promise.py     │       │ - lib/asset_cache.py              │
└───────────────┬───────────────┘       └─────────────────┬─────────────────┘
                │                                         │
                └────────────────────┬────────────────────┘
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ backlot/ (FastAPI living storyboard)   │
                  │ Checkpoint storage & real-time preview │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ remotion-composer/ (React / Remotion)  │
                  │ - Explainer.tsx, CaptionOverlay.tsx    │
                  │ - TerminalScene.tsx, StatReveal.tsx    │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ FFmpeg Compose & Output Video (.mp4)   │
                  └────────────────────────────────────────┘
```

---

## 4. Detailed Feature Table

| Feature ID | Feature / Behavior | Status | How it Works in Code | Source Evidence (`195eab...`) | Test Evidence | Limitations / Risks | Reuse Potential |
|---|---|---|---|---|---|---|---|
| OM-F01 | Slideshow Risk Scoring | **Implemented** | Evaluates 6 dimensions (repetition, decorative visuals, weak motion, weak shot intent, typography overreliance, cinematic claims) returning a 0–5 risk score. | `lib/slideshow_risk.py:27-145` | `tests/qa/QA_PLAN.md` (documented), `tests/qa/test_07_playbook_intelligence.py` | Advisory heuristic; does not inspect rendered video frames, only AST scene metadata. | **Adapt** (cleanroom logic) |
| OM-F02 | Speech Pacing & Landmark Sync | **Implemented** | Computes frame math matching Remotion step timing; enforces that narration landmarks match visible events within tolerance. | `lib/verify_scene_pacing.py:32-95` | `tests/lib/test_verify_scene_pacing.py` (referenced in repo) | Tailored to terminal/code UI steps; requires generalization for arbitrary scene IR. | **Adapt** |
| OM-F03 | Delivery Promise Locking | **Implemented** | Classifies video promise (motion-led vs source-led vs data-explainer); blocks silent downgrade to still slides. | `lib/delivery_promise.py:21-75` | `tests/lib/test_checkpoint_decision_validation.py` | Static rules; depends on external provider availability. | **Reference only** |
| OM-F04 | Word-Level Caption Overlay | **Implemented** | Remotion component with word-by-word timing, pagination, spring transitions, and automated BiDi/RTL detection. | `remotion-composer/src/components/CaptionOverlay.tsx:11-85` | Not executed | High client-side Remotion coupling; React 18 component. | **Adapt** (Remotion helper) |
| OM-F05 | Scene Variation Checker | **Implemented** | Regex and vocabulary analysis flagging buzzwords, repetitive framing, and lazy visual descriptors. | `lib/variation_checker.py:20-65` | `tests/lib/test_variation_checker_runs.py:12-40` | Text/script level only; cannot evaluate rendered graphical entropy. | **Adapt** |
| OM-F06 | Living Storyboard (Backlot) | **Implemented** | FastAPI server providing web-based storyboard review, step inspection, and asset scrubbing. | `backlot/server.py:15-110` | `tests/backlot/test_server.py` | Requires running second server daemon; custom web UI. | **Reference only** |
| OM-F07 | Content-Addressed Asset Caching | **Implemented** | SHA-256 hash-based file caching for audio, visual assets, and generated clips. | `lib/asset_cache.py:18-95` | `tests/lib/test_asset_cache.py:15-55` | Local filesystem cache; lacks multi-tier invalidation for nested IR edits. | **Adapt** |
| OM-F08 | Manim Integration | **Absent** | No native Manim scene executor or hybrid renderer bridge. | Search for `manim` in repo yields 0 code matches. | N/A | Exclusively relies on Remotion and external generative video tools. | **None** |
| OM-F09 | MCP Protocol Support | **Absent** | No MCP server or tools exposed. Uses CLI and direct Python module invocations. | Search for `mcp` in repo yields 0 matches. | N/A | Cannot be used as an MCP tool provider without building wrapper. | **None** |
| OM-F10 | Deterministic Safe Zone Gate | **Absent** | No automated bounding box or crop validation against platform safe zones (14% top / 35% bottom). | Code inspection in `remotion-composer/` | N/A | Remotion components use CSS percentages without hard linter gates. | **Must Build New** |

---

## 5. Representative Execution Trace
1. **Entrypoint:** `render_demo.py` or `scripts/run_pipeline.py`.
2. **Config Load:** `lib/config_model.py:load_config()` parses `config.yaml` into Pydantic models.
3. **Pipeline Ingestion:** `lib/pipeline_loader.py:load_pipeline()` resolves step dependencies.
4. **Pre-flight Lint:** `lib/slideshow_risk.py:score_slideshow_risk(scenes)` and `lib/variation_checker.py:check_scene_variation(scenes)`. If verdict is `fail`, pipeline halts.
5. **Asset Acquisition:** `tools/audio/` and `tools/video/` check `lib/asset_cache.py`. On miss, calls provider APIs.
6. **Timing Alignment:** `lib/verify_scene_pacing.py:assert_alignment()` verifies step timings against audio cue landmarks.
7. **Composition:** Invokes Node.js sub-process `remotion render remotion-composer/src/index.tsx Explainer out/video.mp4`.
8. **Final Assembly:** FFmpeg muxes normalized audio and burns subtitles.

---

## 6. Quality and Security Findings

### CRITICAL: AGPL-3.0 License Viral Risk
- **Location:** `LICENSE` (GNU Affero GPL v3.0).
- **Impact:** Any system that incorporates or links OpenMontage code directly and is made available over a network (e.g., via MCP or web API) must make its complete source code available under AGPL-3.0.
- **Remediation:** Do not import OpenMontage packages directly. Reimplement key algorithms (such as the slideshow risk formulas and pacing landmark math) cleanroom under MIT/Apache-2.0.

### HIGH: Unchecked External Subprocess Spawning
- **Location:** `tools/video/render.py` and `scripts/render_demo.py`.
- **Finding:** Spawns `npx remotion` and `ffmpeg` without robust shell sanitization or strict execution isolation.
- **Risk:** Potential argument injection if user prompts dictate filenames or font paths without sanitization.

### MEDIUM: Heavy Cloud Provider Lock-in & Secret Exposure Risk
- **Location:** `lib/providers/` and `.env.example`.
- **Finding:** Hardcoded expectations for Vertex AI service accounts, Fal keys, and OpenAI keys.
- **Risk:** High operational cost, network fragility, and failure to run fully offline/air-gapped.

---

## 7. Test and CI Assessment
- **Observed Tests:** 32 test files across `tests/lib`, `tests/qa`, `tests/contracts`, `tests/backlot`.
- **Test Quality:** Uses `pytest`. Good mocking of provider contracts. However, end-to-end video tests (`tests/qa/test_08_end_to_end.py`) require live API tokens and were skipped in unauthenticated environments.
- **Execution Status:** Static analysis conducted. Unit tests verified via code structure; full rendering tests skipped due to lack of cloud API credentials in the air-gapped test environment.

---

## 8. Reusability Analysis
- **Candidate Modules:**
  1. `lib/slideshow_risk.py`: 6-dimension scoring heuristic (Cleanroom reimplementation recommended).
  2. `lib/verify_scene_pacing.py`: Frame-rate landmark math.
  3. `remotion-composer/src/components/CaptionOverlay.tsx`: RTL and word-level caption component concepts.
- **Extraction Barrier:** High license barrier (AGPL-3.0). Medium technical barrier due to Pydantic v2 and Remotion 4.0 dependencies.

---

## 9. Known Unknowns
- How reliably the slideshow risk score correlates with human viewers on short-form reels (empirical validation needed).
- Performance overhead of Remotion multi-layer rendering on resource-constrained systems without GPU acceleration.

---

## 10. Recommendation: Study Concepts Only / Cleanroom Reimplementation
**Verdict: Reject direct code inclusion; adopt architectural algorithms.**
OpenMontage provides the best conceptual model for pacing and visual monotony detection among all five projects. However, the AGPL-3.0 license prevents direct code inclusion in commercial or modular MIT/Apache systems, and it completely lacks MCP tools and Manim support. We will reimplement its slideshow risk scoring and audio landmark pacing math cleanly in TypeScript.
