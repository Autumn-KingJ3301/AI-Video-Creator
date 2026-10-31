# ADR-002: Scene IR Schema, Versioning, and Frame-Based Timing Contract

- **Status:** Accepted
- **Date:** 2026-10-30
- **Context:** Timing drift between narration audio and video cuts is the most common failure mode in automated video engines. Floating-point second representations accumulate rounding discrepancies across multiple scene cuts.
- **Decision:**
  1. The **Scene IR (Intermediate Representation)** will be strictly versioned (`$schema: "https://reel-engine.dev/schemas/v0.1/scene-ir.json"`).
  2. All temporal values (scene start/end, visual events, reading dwell times, transition lengths) **MUST** be stored as integer frame numbers (`start_frame`, `end_frame`) relative to the project frame rate (`fps: 30`).
  3. Floating-point second timestamps from Whisper transcription will be quantized to the nearest integer frame during initial audio alignment: `frame = Math.round(seconds * fps)`.
- **Consequences:**
  - *Positive:* 100% deterministic cut alignment; zero cumulative A/V lip-sync drift over arbitrarily long videos.
  - *Positive:* Simplifies Remotion frame rendering (`useCurrentFrame()`) and FFmpeg frame math.
  - *Trade-off:* Agents must specify landmarks in integer frames or use engine helper macros to convert seconds to frames.
- **Evidence:** Validated against `OpenChatCut/server/media-timecode.ts` frame math and `Reel Engine Design Document v0.1 §6 (Rule 2)`.
