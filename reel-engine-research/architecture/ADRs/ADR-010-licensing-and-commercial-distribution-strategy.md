# ADR-010: Licensing and Commercial Distribution Strategy

- **Status:** Accepted
- **Date:** 2026-10-30
- **Context:** Two of the audited repositories (`OpenMontage` and `OpenChatCut`) are licensed under **AGPL-3.0**. Copying or linking AGPL code would force the entire Reel Engine codebase to be released under AGPL-3.0, restricting commercial deployment, SaaS hosting, and modular integration. In addition, Remotion uses a custom commercial license for large teams.
- **Decision:**
  1. **Strict Permissive Core:** The Reel Engine core codebase will be licensed under the **MIT License** or **Apache License 2.0**.
  2. **AGPL Exclusion Rule:** Zero lines of code from `OpenMontage` or `OpenChatCut` will be copied or dynamically linked. All valuable algorithms (such as OpenMontage's slideshow risk scoring and OpenChatCut's hardware acceleration probe) will be **cleanroom-reimplemented** in TypeScript.
  3. **Direct MIT Vendor Reuse:** Only MIT-licensed modules from `mimic-mcp`, `manim-mcp`, and `short-video-maker` will be directly vendor-copied, preserving original copyright notices.
  4. **Remotion License Isolation:** Remotion will be encapsulated behind the `RemotionAdapter` interface. This allows teams to comply with Remotion's licensing terms or swap in alternative headless renderers (e.g. Motion Canvas, Puppeteer Canvas) if Remotion commercial terms are unacceptable.
- **Consequences:**
  - *Positive:* 100% legal clarity; zero risk of copyleft viral contamination.
  - *Positive:* Safe for proprietary commercial distribution, enterprise deployment, or open-source contribution.
  - *Trade-off:* Requires re-authoring the slideshow risk scoring and hardware probe algorithms cleanroom from mathematical principles.
- **Evidence:** Follows Principle 8 of the research brief and verified against licenses in `reel-engine-research/repos/`.
