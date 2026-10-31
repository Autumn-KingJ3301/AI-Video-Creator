# ADR-009: Agent-Authored Code Isolation and Security

- **Status:** Accepted
- **Date:** 2026-10-30
- **Context:** A coding agent generates raw TypeScript (Remotion) and Python (Manim) code to render scenes. Executing unverified agent code risks arbitrary code execution, filesystem tampering, credential theft, and denial-of-service loops.
- **Decision:**
  1. **Python / Manim Security:** Adopt `manim-mcp`'s AST Code Sandbox (`manim_mcp/core/sandbox.py:CodeSandbox`). Inspect Python AST before execution to block:
     - 26 dangerous modules (`os`, `subprocess`, `sys`, `shutil`, `socket`, `http`, `urllib`, `requests`, `importlib`, `ctypes`, etc.).
     - Dangerous builtins (`exec`, `eval`, `compile`, `__import__`, `open`, `input`, `breakpoint`).
     - Dunder traversal (`__subclasses__`, `__class__`, `__globals__`, `__code__`).
  2. **TypeScript / Remotion Security:** Scenes are restricted to importing from the local `reel-remotion-helpers` package. Remotion worker processes execute in isolated temporary working directories with read-only workspace access and zero network egress.
  3. **Resource Caps:** Hard execution timeouts (default 60s per scene) and memory limits enforced via OS process watchers.
- **Consequences:**
  - *Positive:* Prevents malicious or hallucinated agent code from executing system commands or exfiltrating data.
  - *Positive:* Fast, in-memory static AST validation before expensive process spawning.
  - *Trade-off:* Does not replace container-level cgroups isolation for adversarial multi-tenant environments, but provides robust defense-in-depth for single-tenant local execution.
- **Evidence:** Directly validated in `manim-mcp/tests/test_sandbox.py`.
