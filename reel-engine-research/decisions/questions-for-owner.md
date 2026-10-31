# Critical Architectural Decisions for Project Owner

This document outlines the four critical business, licensing, and scoping decisions required from the project owner before commencing implementation.

---

## Decision 1: Remotion Commercial Licensing vs Open-Source Rendering Alternatives
- **Context:** Remotion powers our kinetic text and motion graphics. Remotion uses a custom commercial license: free for individuals and small teams (< 3 employees), but requires a paid Company License for commercial products or automated video generation platforms.
- **Choices:**
  - **Option A (Recommended):** Proceed with Remotion for v0.1 MVP under its free evaluation/small-entity terms, while strictly preserving our `RemotionAdapter` interface. This allows us to deliver high-quality motion graphics immediately and swap in an open-source alternative (e.g. Motion Canvas or Puppeteer Canvas) if licensing becomes an obstacle later.
  - **Option B:** Ban Remotion from day one; build exclusively on pure FFmpeg and open-source Canvas libraries. (Adds ~2 weeks of custom graphics engineering).
- **Owner Action:** Confirm acceptance of Option A or mandate Option B.

---

## Decision 2: Local Open-Source Voice Synthesis vs Cloud TTS
- **Context:** Reel Engine requires voiceover audio with word timestamps to drive the master clock.
- **Choices:**
  - **Option A (Recommended):** Use local open-source models: Kokoro TTS (`af_heart`) or Piper TTS for voice generation, coupled with local Whisper (`whisper.cpp`) for transcription. Completely free, runs offline, zero API bill.
  - **Option B:** Rely on commercial cloud APIs (ElevenLabs for voiceover, OpenAI Whisper API). Produces slightly higher voice nuance, but introduces ongoing per-video API costs ($0.10–$0.30 per reel) and network failure modes.
- **Owner Action:** Choose default TTS provider strategy for starter presets.

---

## Decision 3: Agent Creative Latitude (Strict Preset Catalog vs Freeform Code)
- **Context:** Section 13 of the Design Document raises the question of how much creative freedom the coding agent should have when writing scene code.
- **Choices:**
  - **Option A (Recommended for v0.1):** **Strict Preset Catalog.** The agent must choose from a curated catalog of tested scene layouts (`focal_center_label_top`, `split_comparison`, `stat_callout`) and transitions. The engine rejects uncataloged custom CSS/Manim classes. Maximizes reliability, visual polish, and safe-zone compliance.
  - **Option B:** **Freeform Mode.** The agent can write arbitrary React/Remotion JSX and Manim Python animations. Higher creative potential, but significantly increases the rate of linter failures, clobbered layouts, and render timeouts.
- **Owner Action:** Approve Strict Preset Catalog for v0.1 MVP.

---

## Decision 4: Execution Isolation Level (Process AST vs Docker Containers)
- **Context:** The agent writes Python code executed by the Manim worker.
- **Choices:**
  - **Option A (Recommended for Local Dev):** Static AST Sandbox (`CodeSandbox` from `manim-mcp`) running in a standard local Python sub-process. Zero Docker overhead, instant startup.
  - **Option B (Recommended for Hosted / Multi-Tenant Service):** Wrap the Manim worker in a hardened Docker container with no network access, memory limits, and read-only filesystem mounts. Adds container orchestration overhead.
- **Owner Action:** Confirm Option A for local developer workstation use, with Option B roadmap for hosted deployment.
