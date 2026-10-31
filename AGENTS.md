# Reel Engine Autonomous Video Creator Guidelines

This workspace is powered by **Reel Engine**, an autonomous 9:16 short-form vertical video engine.

## Available Capabilities & MCP Server

The `reel-engine` MCP server is registered in `.agents/mcp_config.json` and globally in `~/.gemini/config/mcp_config.json`.
It provides 10 atomic tools over stdio:
1. `reel_init_project`: Ingest creative brief and load style preset.
2. `reel_transcribe_audio`: Process narration audio or synthesize script text with native TTS.
3. `reel_plan_scenes`: Submit contiguous Scene IR with integer frame boundaries.
4. `reel_lint_scene_ir`: Pre-render static QA checks (hook deadline, visual pacing <= 2.5s, safe zones, reading speed).
5. `reel_author_scene`: Write Remotion TSX or Manim Python code (AST sandbox protected).
6. `reel_render_scene`: Render scene clips with content-addressed caching (0s for cached clips).
7. `reel_verify_quality`: Run post-render media inspection and score director rubric.
8. `reel_apply_edits`: Non-destructively apply trim and scene ordering without re-rendering.
9. `reel_compose_video`: Duck music (-12dB), burn captions, and export final 1080x1920 MP4 with NVENC/libx264.
10. `reel_get_state`: Query current phase, active blockers, and recommended next step.

## Skill & Style Reference
- Skill: Activate `reel-director` skill located in `.agents/skills/reel-director/SKILL.md`.
- Theme: Corsela Editorial Theme (Warm Ivory `#F4F0EA`, Dark Charcoal `#141413`, Terracotta `#C84B22`, White Cards `#FFFFFF`).
