# ADR-003: Remotion/Manim Adapter Interface and Media Normalization

- **Status:** Accepted
- **Date:** 2026-10-30
- **Context:** Reel Engine requires a dual-renderer architecture (Remotion for text/UI graphics, Manim for math/science). The two engines operate on different coordinate models, color formats, and frame-rate conventions.
- **Decision:**
  1. Define a standardized **Renderer Adapter Interface**:
     ```typescript
     interface SceneRendererAdapter {
       renderScene(scene: SceneIR, profile: RenderProfile): Promise<SceneRenderResult>;
     }
     ```
  2. Implement `RemotionAdapter` and `ManimAdapter`. Both adapters must output standardized, audio-free MP4 scene clips conforming to the project's exact resolution (1080x1920 or 540x960), constant frame rate (CFR), and color space (YUV420p Rec.709).
  3. Shared scene helper packages (`reel-remotion-helpers` and `reel_manim_helpers`) will expose unified percentage coordinates (`x: 0..1, y: 0..1`), safe zone bounds, and ProjectConfig style tokens.
- **Consequences:**
  - *Positive:* Scenes render independently; renderers can be mixed in a single project without style inconsistencies.
  - *Positive:* Enables caching per scene clip; re-rendering one scene does not affect others.
  - *Trade-off:* Requires maintaining helper libraries in both TypeScript and Python.
- **Evidence:** Demonstrated in `manim-mcp/core/renderer.py` and `OpenMontage/remotion-composer/`.
