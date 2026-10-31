# ADR-006: Cache Design and Content-Addressed Assets

- **Status:** Accepted
- **Date:** 2026-10-30
- **Context:** Rendering 9:16 video scenes (especially with Manim and Remotion) is computationally intensive. When an agent tweaks one scene or changes a single word in a caption, re-rendering the entire video wastes minutes of CPU/GPU time.
- **Decision:**
  1. All intermediate scene clips will be content-addressed and cached by computing a SHA-256 hash across all scene dependencies:
     ```
     cache_key = sha256(
       canonical_json(scene_ir_entry) +
       file_bytes(scene_code_file) +
       canonical_json(style_tokens) +
       audio_slice_bytes +
       renderer_version
     )
     ```
  2. Cache storage lives in `.cache/clips/<cache_key>.mp4`.
  3. When `render_scene(scene_id)` is invoked, the engine checks for an existing clip matching `cache_key`. On hit, it symlinks/copies the cached clip instantly.
- **Consequences:**
  - *Positive:* Near-instant iteration when fixing individual scenes or testing transitions.
  - *Positive:* Deterministic reproducibility across different machines and render runs.
  - *Trade-off:* Cache directory requires periodic garbage collection of orphaned clips.
- **Evidence:** Follows `Reel Engine Design Document v0.1 §9.3` and adapts `OpenMontage/lib/asset_cache.py`.
