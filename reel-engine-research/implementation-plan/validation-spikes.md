# Engineering Validation Spikes, Sprint Plan, Staffing & Budget

This document details five high-risk technical spikes, a 1-week validation sprint plan, staffing scenarios, and a comprehensive infrastructure budget worksheet.

---

## 1. Five High-Risk Engineering Spikes

### Spike 1: Cross-Renderer Coordinate & Font Metrics Parity
- **Risk:** Remotion and Manim produce visually clashing styles, inconsistent font sizes, or misaligned safe margins when mixed in a single reel.
- **Hypothesis:** A normalized coordinate system (`0.0 .. 1.0`) and shared typography scale can produce identical rendered text bounds and margins in both React/CSS and Python/Cairo.
- **Smallest Experiment:** Render a single test card ("Focal Title" + subtitle) in Remotion (TSX) and Manim (Python) using identical normalized coordinates (`x: 0.5, y: 0.3`). Overlay the two rendered frames in Photoshop/ImageMagick to calculate pixel delta.
- **Success Threshold:** Bounding box origins align within <= 4 pixels; font baseline within <= 2 pixels.
- **Cost / Time Cap:** 1 developer day; $0 external cost.
- **Next Decision:** If successful, lock the shared token contract; if failed, introduce an explicit per-renderer visual compensation scale factor.

---

### Spike 2: AST Python Sandbox Vulnerability & Bypass Probe
- **Risk:** Agent-authored Python Manim code exploits dynamic attribute lookups (e.g. `getattr()`, string formatting, or obfuscated builtins) to bypass `manim-mcp`'s AST validation and achieve host RCE.
- **Hypothesis:** An AST visitor analyzing `ast.Import`, `ast.ImportFrom`, `ast.Call`, and `ast.Attribute` can reliably block 100% of standard Python escape payloads without false positives on legitimate Manim code.
- **Smallest Experiment:** Execute a battery of 25 known Python sandbox escape payloads (including `__subclasses__` crawling, `builtins.__dict__`, `sys.modules` traversal) against `CodeSandbox.validate()`.
- **Success Threshold:** 25/25 exploits rejected with zero execution; standard 3b1b Manim animation scripts parse with 0 false positives.
- **Cost / Time Cap:** 1 developer day; $0 external cost.
- **Next Decision:** If any escape succeeds, mandate Docker container isolation for the Manim worker.

---

### Spike 3: Sliding-Window Frame-Difference Static Interval Detection
- **Risk:** Detecting frozen/static video stretches via pixel differences generates false positives on subtle animated graphics or consumes too much CPU.
- **Hypothesis:** Sampling 1 frame per second and calculating grayscale mean squared error (MSE) across adjacent samples reliably flags frozen video stretches (> 2.5s) in < 100ms.
- **Smallest Experiment:** Generate 3 synthetic test videos: (A) continuously moving animation, (B) completely static slide for 4s, (C) subtle slow zoom. Run FFmpeg `mpdecimate` and a lightweight Node.js buffer MSE script.
- **Success Threshold:** Test video B is caught and rejected 100% of the time; test videos A and C pass without false flags; execution takes < 500ms on a 30s reel.
- **Cost / Time Cap:** 1 developer day; $0 external cost.
- **Next Decision:** Choose between native FFmpeg filter or in-memory JS buffer comparison for Phase D.

---

### Spike 4: Non-Destructive Export Edit List Latency
- **Risk:** Applying trims, toggles, and reordering during export via FFmpeg concat filter without re-rendering clips introduces significant transcoding latency or A/V desync.
- **Hypothesis:** An FFmpeg concat demuxer script operating on pre-rendered intra-refresh MP4 clips can generate the final exported video via stream copy (`-c copy`) in < 2 seconds without re-encoding video frames.
- **Smallest Experiment:** Pre-render four 5-second scene clips. Generate a concat text file reordering scenes (1 -> 3 -> 2 -> 4) and applying a 10-frame trim. Run FFmpeg concat demuxer.
- **Success Threshold:** Export completes in < 2.0 seconds with zero frame corruption or audio pops.
- **Cost / Time Cap:** 1 developer day; $0 external cost.
- **Next Decision:** Use stream copy for video where possible, falling back to fast NVENC transcode only when burning new captions.

---

### Spike 5: Remotion Headless Worker Concurrency & Memory Leakage
- **Risk:** Spawning headless Puppeteer/Chromium instances for Remotion scene renders causes memory bloat and thread starvation under sustained batch usage.
- **Hypothesis:** A single long-lived Remotion bundle server (`remotion render --gl=angle`) managed by a process pool of size 2 maintains stable RSS memory (< 1.5 GB) over 20 consecutive scene renders.
- **Smallest Experiment:** Execute a loop rendering 20 consecutive 5-second Remotion scenes, monitoring Node.js and Chromium memory RSS.
- **Success Threshold:** Total system memory usage stays below 2.0 GB; no orphaned zombie Chrome processes after execution.
- **Cost / Time Cap:** 1 developer day; $0 external cost.
- **Next Decision:** Determine optimal worker concurrency limits for Phase B/E.

---

## 2. One-Week Validation Sprint Plan

Before committing to the full multi-week build, the team should execute this focused 5-day validation sprint to de-risk the core technical hypotheses:

| Day | Primary Focus | Concrete Daily Milestone |
|:---:|---|---|
| **Day 1** | **Spike 1 & Shared Tokens** | Implement basic `reel-remotion-helpers` and `reel_manim_helpers`. Verify coordinate alignment between React and Manim frames. |
| **Day 2** | **Spike 2 & AST Sandbox** | Adapt `manim-mcp/sandbox.py`. Run the 25-payload security battery. Verify 100% AST exploit blocking. |
| **Day 3** | **Spike 4 & FFmpeg Concat** | Author hand-written 15-second Scene IR. Render 3 clips and prove non-destructive FFmpeg stream copy concat in < 2s. |
| **Day 4** | **Spike 3 & QA Gatekeeper** | Vendor-adapt `mimic-mcp` safe-area and loudness modules. Verify that an intentionally misplaced text box halts the pipeline. |
| **Day 5** | **Synthesis & Go/No-Go Gate** | Assemble the findings into a working vertical slice demo. Review results against acceptance criteria. Formal Go/No-Go decision for Phase A–H build. |

---

## 3. Staffing Scenarios

### Scenario A: Solo Full-Stack Video Engineer
- **Profile:** Senior Full-Stack Engineer with strong TypeScript/React, Python, and FFmpeg command-line experience.
- **Timeline:** 6 to 8 weeks to complete Phases A through H.
- **Work Cadence:** Linear execution along the critical path (Phase A → B → C → D → E → F → G → H).
- **Pros/Cons:** Minimal communication overhead; zero coordination friction. Higher vulnerability to single-point-of-failure bottlenecks on complex FFmpeg filtergraphs.

### Scenario B: Small Team (3 Engineers)
- **Roles:**
  1. *Video Systems / Backend Lead (Owner):* Architecture, MCP state machine, FSM, and FFmpeg composer (Phases A, E, F).
  2. *Renderers & Security Engineer:* Remotion adapter, Manim adapter, AST sandbox, and helper packages (Phases B, H).
  3. *Audio & QA / Frontend Engineer:* Whisper timing solver, pause tightener, deterministic quality gates, and React UI (Phases C, D, G).
- **Timeline:** 2.5 to 3.5 weeks to complete MVP (Phases A through G).
- **Work Cadence:** Parallelized execution once Phase A contracts are frozen on Day 3.
- **Pros/Cons:** Rapid delivery; specialized ownership of media pipelines; requires daily synchronization on Scene IR contracts.

---

## 4. Infrastructure & Operating Budget Worksheet

*Note: All pricing estimates reflect current market benchmarks as of October 2026 and assume local-first execution for development.*

| Category | Item / Service | Estimated Monthly / Per-Unit Cost | Usage Assumption (Dev & MVP Testing) | Total Estimated Cost |
|---|---|---|---|---|
| **Local Compute** | Developer Workstation (NVIDIA GPU, 8-core CPU, 32GB RAM) | Existing Hardware ($0) | Local development & testing | **$0.00** |
| **Voiceover / TTS** | Local Kokoro TTS / Piper TTS | Open-source ($0) | Primary local voice synthesis | **$0.00** |
| **Cloud TTS (Optional)** | ElevenLabs Creator Tier | $22.00 / month (100k chars) | High-fidelity voiceover testing | **$22.00** |
| **Transcription / STT**| Local Whisper (`whisper.cpp` / `small.en`) | Open-source ($0) | 100% local word-level timestamping | **$0.00** |
| **LLM Director Testing**| Anthropic Claude 3.5 Sonnet / OpenAI GPT-4o via API | ~$0.015 / 1k input, $0.075 / 1k output | ~50 test reels (500 agent tool calls) | **~$35.00** |
| **Remotion License** | Remotion Company License (if applicable) | $0 (Individual / Free tier for < 3 people or non-commercial research) | Free tier during research & development | **$0.00** |
| **Storage & Caching** | Local NVMe SSD storage | Existing Hardware ($0) | ~20 GB scratch clips and cache | **$0.00** |
| **Total Estimated Validation Budget** | | | **Phase 0–8 Validation & MVP Build** | **~$57.00** |
