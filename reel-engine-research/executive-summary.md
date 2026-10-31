# Executive Summary — Reel Engine Architecture & Implementation Plan

## 1. Top Recommendation
We recommend **Strategy D: Greenfield Core with Selective MIT Library Reuse and Cleanroom Algorithms**.
Rather than forking large, monolithic existing codebases that carry severe copyleft licensing burdens and architectural bloat, we recommend building a clean, focused TypeScript core orchestrator. We will directly vendor-copy and adapt battle-tested, **MIT-licensed** modules from the research set:
1. `manim-mcp`'s **AST Code Security Sandbox** (`manim_mcp/core/sandbox.py`) to safely execute agent-authored Python math animations.
2. `mimic-mcp`'s **Safe Area & Loudness Quality Gates** (`src/safe-area.ts`, `src/loudness.ts`, `src/frame-quality.ts`) for mobile platform compliance and exact -14 LUFS audio normalization.
3. `short-video-maker`'s **Unified Express REST + MCP Server & React Web UI** (`src/server/server.ts`, `src/ui/`) for local browser control.
4. Cleanroom-reimplemented algorithms for `OpenMontage`'s **6-dimension slideshow risk scoring** and `OpenChatCut`'s **hardware video acceleration probing**, authored from mathematical principles under MIT to prevent AGPL viral contamination.

---

## 2. Why This Strategy Wins
- **100% Permissive Licensing (MIT / Apache-2.0):** Completely avoids the viral AGPL-3.0 copyleft terms of `OpenMontage` and `OpenChatCut`, leaving the Reel Engine legally unencumbered for proprietary, SaaS, or commercial distribution.
- **Zero Architectural Bloat:** Bypasses OpenChatCut's massive desktop NLE codebase (Electron, Mediapipe, WebGL shaders) and OpenMontage's cloud AI provider lock-in (Sora 2, Google Vertex, Fal.ai).
- **Exact Requirements Fit:** Provides native, first-class implementation of Reel Engine v0.1 invariants: integer-frame timing, audio-master clock, dual Remotion/Manim rendering, 10 deterministic blocking gates, and the linear 8-phase MCP state machine.
- **Fast Time to First Reel:** Delivers a playable, hand-authored 15-second vertical video vertical slice (Phase A) within **2 weeks** for a solo engineer or **5 days** for a small team.

---

## 3. Main Risks and Mitigations

| Risk Area | Exact Nature of Risk | Architectural Mitigation |
|---|---|---|
| **Licensing** | Remotion commercial licensing fees for large commercial teams ($>0 revenue). | Encapsulate Remotion strictly behind the `SceneRendererAdapter` interface, allowing open-source canvas renderers to be plugged in if needed. |
| **Security** | Malicious or hallucinated agent-generated Python scene code breaking out to host system. | Frontline defense via `manim-mcp` AST Sandbox blocking 26 dangerous modules, builtins, and dunder escapes, backed by air-gapped process execution. |
| **Audio/Visual Drift** | Cumulative rounding drift across multiple scene cuts causing lip-sync desynchronization. | Audio serves as the master clock; all timeline boundaries and event landmarks stored strictly as integer frame numbers relative to project fps. |
| **Agent Quality Monotony** | Coding agents producing boring, static "slideshows" disguised as videos. | Strict pre-flight blocking gates: visual change required every <= 2.5s, character-per-second reading dwell time limits, and slideshow risk scoring. |

---

## 4. Immediate Next Decisions for Project Owner
1. **Approve Strategy D:** Authorize the phased implementation roadmap (Phases A through H).
2. **Execute 1-Week Validation Sprint:** De-risk cross-renderer coordinate parity, AST sandbox exploits, and FFmpeg stream-copy concat before funding the full build.
3. **Confirm Remotion Evaluation Tier:** Accept Remotion for v0.1 MVP under its free developer/small-entity license while maintaining renderer interface isolation.
