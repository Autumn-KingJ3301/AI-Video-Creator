# Repository Audit: manim-mcp

## 1. Executive Verdict
`manim-mcp` is a focused, well-engineered Python MCP server for mathematical and scientific video generation powered by Manim (`manimgl` and Manim Community Edition). Licensed under the permissive **MIT License**, it provides the exact missing component required by Reel Engine's dual-renderer specification: a secure, sandboxed execution environment for agent-authored Manim Python code. Its `CodeSandbox` (`manim_mcp/core/sandbox.py`) performs rigorous Abstract Syntax Tree (AST) inspection, blocking system calls, file I/O, dangerous builtins, and dunder attribute traversal before code execution. It also includes an asynchronous render worker with SSE progress streaming, concurrency control, and 3Blue1Brown-inspired animation quality scoring. While it lacks vertical reel formatting, safe zone checks, and Remotion integration, it is the **uncontested best donor for Reel Engine's Manim rendering worker**.

---

## 2. Repository Snapshot

| Attribute | Verified Value |
|---|---|
| **Canonical URL** | `https://github.com/paulnegz/manim-mcp` |
| **Pinned Commit SHA** | `efd75c8d626301c03694a6606753eaa42f447924` |
| **Commit Date** | 2026-02-25T00:22:52-06:00 |
| **Default Branch** | `main` |
| **License** | **MIT License** (`LICENSE`) |
| **Primary Languages** | Python 3.11+ |
| **Runtimes & Frameworks** | FastMCP (`mcp.server.fastmcp`), ManimGL, Manim CE, Pydantic, ChromaDB |
| **Package Managers** | Hatchling (`pyproject.toml`) |
| **Submodules / LFS** | None |
| **Containerization** | Dockerfile, `docker-compose.yml` |

---

## 3. Architecture Map

```
                  ┌────────────────────────────────────────┐
                  │ Coding Agent / Director (MCP Protocol) │
                  └──────────────────┬─────────────────────┘
                                     │ (tools/generate.py)
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ manim_mcp/server.py (FastMCP Server)   │
                  │ - SSE Progress Endpoint (/progress/:id)│
                  │ - JSON-RPC MCP Tools                   │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ AST Code Security Sandbox               │
                  │ manim_mcp/core/sandbox.py              │
                  │ - BLOCKED_MODULES (os, subprocess, etc)│
                  │ - DANGEROUS_BUILTINS (exec, eval, open)│
                  │ - BLOCKED_DUNDERS (__subclasses__, etc)│
                  └──────────────────┬─────────────────────┘
                                     │ (If Valid)
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ Code Bridge & Quality Linter           │
                  │ - core/code_bridge.py (CE -> GL)       │
                  │ - core/quality.py (3b1b Quality Score) │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ manim_mcp/core/renderer.py             │
                  │ Async sub-process render worker        │
                  │ Timeouts, Concurrency Limits, Cache    │
                  └──────────────────┬─────────────────────┘
                                     │
                                     ▼
                  ┌────────────────────────────────────────┐
                  │ Output Video Clip (.mp4)               │
                  └────────────────────────────────────────┘
```

---

## 4. Detailed Feature Table

| Feature ID | Feature / Behavior | Status | How it Works in Code | Source Evidence (`efd75c...`) | Test Evidence | Limitations / Risks | Reuse Potential |
|---|---|---|---|---|---|---|---|
| MM-F01 | AST Security Code Sandbox | **Implemented** | Parses Python code via `ast.parse()`; rejects blocked imports (`os`, `subprocess`, `requests`), builtins (`open`, `eval`), and dunder escapes (`__subclasses__`). | `manim_mcp/core/sandbox.py:18-85` | `tests/test_sandbox.py:15-90` | AST validation does not replace OS-level cgroups/container isolation, but provides strong first-line defense. | **Direct Reuse (MIT)** |
| MM-F02 | Async Manim Rendering Pipeline | **Implemented** | Executes `manimgl` or `manim` in temporary directories with concurrency locks, render timeouts, and output verification. | `manim_mcp/core/renderer.py:45-165` | `tests/test_renderer.py` | Requires local Python environment with LaTeX, ffmpeg, and manim installed. | **Direct Reuse** |
| MM-F03 | CE to ManimGL Code Bridge | **Implemented** | Rewrites Community Edition (Manim CE) syntax into 3b1b ManimGL syntax; normalizes camera and coordinate imports. | `manim_mcp/core/code_bridge.py:20-95` | `tests/test_pipeline.py` | Heuristic AST rewrites may miss obscure custom mobjects. | **Reuse / Adapt** |
| MM-F04 | FastMCP Tool Server | **Implemented** | Exposes `generate_animation`, `edit_animation`, `list_renders` via official `mcp.server.fastmcp.FastMCP`. | `manim_mcp/server.py:30-65`, `manim_mcp/tools/generate.py` | `tests/test_tools.py` | Stateless HTTP / SSE mode supported. | **Adapt** (MCP Server) |
| MM-F05 | Animation Quality Scoring | **Implemented** | Evaluates pacing (wait call variance), transforms, lagged starts, and semantic colors against Grant Sanderson patterns. | `manim_mcp/core/quality.py:18-75` | `tests/test_pipeline.py` | Heuristic code analysis; does not verify rendered video pixels. | **Adapt** (Manim QA) |
| MM-F06 | SSE Progress Streaming | **Implemented** | Streams render progress events (`GET /progress/{render_id}`) to MCP clients and web listeners. | `manim_mcp/server.py:65-95`, `manim_mcp/progress.py` | Manual verification | Requires HTTP server alongside stdio MCP if SSE is desired. | **Adapt** |
| MM-F07 | Vertical 9:16 Canvas Support | **Partial** | Supports arbitrary resolution and aspect ratios via render parameters, but lacks native 9:16 safe area coordinate helpers. | `manim_mcp/models.py:35-60` | `tests/test_renderer.py` | Camera frame defaults to 16:9; agent must manually set vertical camera frame. | **Adapt** (Reel Helper) |
| MM-F08 | Remotion Integration | **Absent** | Dedicated exclusively to Manim. | Codebase inspection | N/A | No React or Remotion support. | **None** |
| MM-F09 | Speech Timing Synchronization | **Absent** | Basic TTS (`core/tts.py`) exists, but lacks phrase-level alignment, audio-driven cuts, and pause tightening. | `manim_mcp/core/tts.py:12-40` | N/A | Cannot synchronize scene boundaries to audio master clock. | **Must Build New** |
| MM-F10 | Deterministic Composition | **Absent** | Exports single Manim clips; lacks multi-scene composition, caption burn-in, or non-destructive edit list. | Codebase inspection | N/A | Requires external compositor (FFmpeg). | **Must Build New** |

---

## 5. Representative Execution Trace
1. **MCP Tool Call:** Agent calls `generate_animation(prompt, resolution="1080x1920", fps=30)`.
2. **Code Generation:** Agent or internal prompt generates Manim Python script.
3. **AST Sandbox Gate:** `CodeSandbox.validate(code)` checks syntax, imports, builtins, and dunders.
4. **Code Bridge:** `bridge_code(code)` transforms CE conventions to target Manim runtime.
5. **Quality Review:** `QualityScore` grades animation rhythm.
6. **Execution Worker:** `renderer.py` executes Manim in isolated directory with timeout watchdog.
7. **Clip Artifact:** Returns completed `.mp4` clip path and thumbnail to caller.

---

## 6. Quality and Security Findings

### CRITICAL / POSITIVE: Robust Code Sandboxing
- **Location:** `manim_mcp/core/sandbox.py:18-85`.
- **Finding:** Outstanding AST security layer. Explicitly blocks:
  - 26 dangerous modules (`os`, `subprocess`, `sys`, `shutil`, `socket`, `http`, `urllib`, `requests`, `importlib`, `ctypes`, `multiprocessing`, `pickle`, `tempfile`, etc.).
  - Dangerous builtins (`exec`, `eval`, `compile`, `__import__`, `open`, `input`, `breakpoint`).
  - Dunder attributes (`__subclasses__`, `__class__`, `__bases__`, `__globals__`, `__code__`, `__builtins__`, `__mro__`).
- **Significance:** Solves Reel Engine's primary security requirement for executing agent-authored Python scene code.

### MEDIUM: Manim Process Resource Consumption
- **Location:** `manim_mcp/core/renderer.py:110-140`.
- **Finding:** Complex 3D Manim scenes can consume significant CPU/GPU memory and cause thread starvation without worker process limits.
- **Remediation:** Enforce concurrency limiter (`max_concurrent_renders = 2`) and process timeouts.

---

## 7. Test and CI Assessment
- **Observed Tests:** 8 comprehensive test suites in `tests/`: `test_sandbox.py`, `test_renderer.py`, `test_scene_parser.py`, `test_pipeline.py`, `test_tools.py`, `test_storage.py`, `test_tracker.py`, `test_e2e.py`.
- **Quality:** High unit test maturity using `pytest` and `pytest-asyncio`. Excellent negative test cases in `test_sandbox.py` verifying that dangerous exploit payloads are reliably blocked.

---

## 8. Reusability Analysis
- **Candidate Modules (Highest Reuse Value):**
  1. `manim_mcp/core/sandbox.py`: **Essential.** Immediate reuse for Reel Engine agent-generated Python code validation.
  2. `manim_mcp/core/renderer.py`: Reusable Manim rendering worker with timeouts and error parsing.
  3. `manim_mcp/core/quality.py`: Scoring heuristics for animation motion language.
- **Extraction Barrier:** Minimal. MIT licensed, pure Python with clean Pydantic interfaces.

---

## 9. Known Unknowns
- Manim vertical 9:16 rendering performance across Intel/AMD CPUs when rendering complex LaTeX formulas without cached assets.

---

## 10. Recommendation: Adopt as the Official Manim Renderer Adapter (MIT)
**Verdict: Perfect Candidate for Reel Engine's Manim Subsystem.**
`manim-mcp` is an impeccably designed, MIT-licensed Python service that directly solves Reel Engine's mathematical rendering and agent code security requirements. It should be encapsulated as the Manim adapter worker in the Reel Engine architecture.
