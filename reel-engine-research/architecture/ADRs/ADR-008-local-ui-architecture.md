# ADR-008: Local UI Architecture and Integration

- **Status:** Accepted
- **Date:** 2026-10-30
- **Context:** While the coding agent acts as creative director, a human user must be able to observe progress, review rendered clips, inspect lint diagnostics, adjust non-destructive edits, and trigger export.
- **Decision:**
  1. Build a local web interface using **React 18, Vite, and TailwindCSS**, hosted by the same Node.js Express server that exposes the MCP SSE endpoint (pattern borrowed from `short-video-maker`).
  2. The UI is **intentionally not a full NLE**. It provides:
     - Phase View: current pipeline phase and active blocker.
     - Scene Timeline: list of scenes with thumbnails, duration, and renderer badges.
     - Lint Diagnostic Panel: visual display of blocking errors (highlighting offending frames and coordinates).
     - Video Player: playback of intermediate scene clips and final composed video.
     - Prompt Panel: generates bootstrap prompts for the coding agent for each phase.
     - Non-Destructive Post-Production Controls: minimal trim, reorder, and mute toggles that write to the `edit` section of project state.
- **Consequences:**
  - *Positive:* Ultra-lightweight footprint; zero Electron or WebGL shader dependencies.
  - *Positive:* Runs directly in any local browser at `http://localhost:3000`.
  - *Trade-off:* Does not support drag-and-drop keyframe manipulation or complex multi-layer timeline slicing (out of scope for v0.1).
- **Evidence:** Adapts `short-video-maker/src/ui/` and addresses `Reel Engine Design Document v0.1 §12.3`.
