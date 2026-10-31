# ADR-001: Core Implementation Language and Process Boundaries

- **Status:** Accepted
- **Date:** 2026-10-30
- **Context:** Reel Engine requires orchestrating an agent-driven workflow, serving an MCP interface, compiling Remotion (TypeScript/React) scenes, executing Manim (Python) mathematical animations, running FFmpeg composition, and hosting a local React web UI.
- **Decision:** The core engine orchestrator, MCP server, quality gates, and composition coordinator will be written in **TypeScript / Node.js (ESM)**. Manim rendering will be encapsulated in a dedicated **local Python worker service**, communicating via local JSON-RPC/stdio or loopback HTTP.
- **Consequences:**
  - *Positive:* TypeScript provides native parity with Remotion, Vite, React UI, and modern MCP SDKs; avoids cumbersome Node-to-Python cross-language embedding in a single process.
  - *Positive:* Python worker isolates Manim dependencies (LaTeX, Cairo, manimgl, PyGObject) in a separate virtual environment without polluting the Node.js runtime.
  - *Trade-off:* Requires managing two runtimes (Node.js 24 and Python 3.11+) on the host or inside containers.
- **Evidence:** Demonstrated in `short-video-maker` (TypeScript server) and `manim-mcp` (isolated Python FastMCP worker).
