# Architectural Strategies Evaluation (Options A, B, C, D)

This document provides a rigorous trade-off analysis of the four architectural paths available for building the Reel Engine, evaluating technical feasibility, licensing exposure, maintenance burden, and time-to-market.

---

## Strategy A: Fork OpenMontage and Narrow Pipelines
- **Concept:** Fork `OpenMontage` (`195eab`), strip away its multi-provider generative video tooling (Sora, Fal, Kling), keep its Backlot storyboard and Remotion explainer composer, and graft in a custom Manim pipeline and MCP server.
- **Requirements Coverage:** Moderate (~45%). Covers Remotion rendering and slideshow risk heuristics, but completely lacks MCP tools, Manim support, deterministic blocking gates, and integer-frame timing.
- **Licensing Constraint (DEAL-BREAKER):** **AGPL-3.0**. Any modifications or hosted services must be made publicly available under AGPL-3.0. This prevents commercial closed-source distribution and restricts integration with proprietary toolchains.
- **Maintenance & Complexity Burden:** High. OpenMontage has a large Python footprint (FastAPI, WebSockets, Pydantic, D3, TopoJSON) with deep coupling to cloud AI APIs that must be surgically unpicked.
- **Security & Sandboxing:** Low. Agent-authored code execution would need to be built from scratch.
- **Time to First Reel:** 4–6 weeks.
- **Verdict:** **REJECTED.** AGPL copyleft viral taint, lack of native MCP, and heavy cloud bloat make forking OpenMontage undesirable.

---

## Strategy B: Fork OpenChatCut and Add Scene Planning & QA Gates
- **Concept:** Fork `OpenChatCut` (`7fa4b7`), strip the Electron desktop shell down to a headless server, replace its free-form timeline editor with the Reel Engine Scene IR, add Manim rendering, and convert its advisory `sceneQuality.ts` into a blocking gate.
- **Requirements Coverage:** Moderate (~55%). Covers headless Remotion rendering, hardware video acceleration, and base MCP tooling.
- **Licensing Constraint (DEAL-BREAKER):** **AGPL-3.0-or-later**. Like OpenMontage, OpenChatCut's codebase is legally encumbered by AGPL copyleft provisions.
- **Maintenance & Complexity Burden:** **Very High (Severe Bloat).** OpenChatCut is a massive, multi-gigabyte repository bundling WebGL shaders, Mediapipe, Electron, audio worklets, and complex multi-track timeline data structures. Maintaining a fork would require enormous ongoing overhead.
- **Manim Feasibility:** Very low. OpenChatCut is pure Node.js/TypeScript with zero Python runtime scaffolding.
- **Time to First Reel:** 6–8 weeks.
- **Verdict:** **REJECTED.** The enormous overhead of an entire desktop NLE codebase combined with AGPL licensing makes this an impractical and unmaintainable choice.

---

## Strategy C: Build from mimic-mcp / short-video-maker Base with Manim Worker
- **Concept:** Use `mimic-mcp` (for quality gates and Remotion helpers) and `short-video-maker` (for Express REST/MCP server and React UI skeleton), adapt `manim-mcp` as an external Python worker, and build an original Scene IR and timing engine.
- **Requirements Coverage:** High (~85%). Inherits tested MIT safe-zone math, loudness normalization, frame contrast analysis, AST Python security, and local web UI.
- **Licensing:** **100% Permissive (MIT).** Zero AGPL viral contamination. Safe for commercial deployment, closed-source SaaS, or open-source distribution.
- **Maintenance & Complexity Burden:** Low to Moderate. Each borrowed component is small, modular, and well-tested in Vitest/pytest.
- **Security & Isolation:** High. Inherits `manim-mcp`'s battle-tested AST code sandbox blocking 26 dangerous modules and dunder escapes.
- **Time to First Reel:** 2–3 weeks.
- **Verdict:** **STRONG CONTENDER / PREFERRED HYBRID.** Combines the best permissive components while keeping the core engine clean and lightweight.

---

## Strategy D: Greenfield Core with Selective Library Reuse (Recommended)
- **Concept:** Build a clean, decoupled TypeScript core engine implementing the Scene IR, integer-frame timing solver, and strict phased MCP state machine. Directly vendor-copy and adapt the small, high-value MIT modules (`mimic-mcp` safe-area/loudness/frame-quality; `manim-mcp` AST sandbox and renderer worker; `short-video-maker` UI skeleton), while cleanroom-reimplementing OpenMontage's slideshow risk heuristics in TypeScript.
- **Requirements Coverage:** **Complete (100%).** Exactly fulfills every invariant and gate in Reel Engine Design Document v0.1 without legacy baggage.
- **Licensing:** **100% MIT / Permissive.** Zero AGPL risk; Remotion isolated behind an adapter interface.
- **Maintenance & Complexity Burden:** **Minimal.** Clean codebase containing only code that directly serves the Reel Engine requirements. High testability, zero bloat.
- **Time to First Reel:** 2 weeks (Build Phase A vertical slice).
- **Verdict:** **SELECTED PRIMARY STRATEGY.** Provides maximum architectural purity, minimal technical debt, zero licensing friction, and direct traceability to every requirement.
