# ADR-005: Job Execution, State Machine, and Persistence

- **Status:** Accepted
- **Date:** 2026-10-30
- **Context:** Coding agents frequently lose context, restart sessions, or call tools out of order. Naive in-memory queues (like `short-video-maker`) lose all work on crash or restart.
- **Decision:**
  1. Implement a formal **Finite State Machine (FSM)**:
     `input` -> `transcribed` -> `planned` -> `authored` -> `rendered` -> `verified` -> `composed` -> `exported`.
  2. Project state will be persisted in an atomic SQLite database or JSON file (`project-state.json`) inside the project workspace directory.
  3. Every tool call returns a standard response envelope containing: `phase`, `status`, `next_step`, and `blocked_by`.
  4. Out-of-order calls are rejected with an informative error stating the missing prerequisite phase.
  5. The server exposes `get_next_step()` to allow any agent session to instantly recover its exact position in the pipeline.
- **Consequences:**
  - *Positive:* 100% crash resilience and resumability; agent context loss does not corrupt project state.
  - *Positive:* Prevents accidental expensive render/compose operations before plans are validated.
  - *Trade-off:* Requires managing state transitions and rollback logic if a scene fails verification.
- **Evidence:** Overcomes the queue loss flaw identified in `short-video-maker/src/short-creator/ShortCreator.ts:42`.
