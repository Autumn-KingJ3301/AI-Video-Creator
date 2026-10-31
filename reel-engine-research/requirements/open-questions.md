# Requirements Open Questions and Uncertainties

This document records ambiguities, trade-offs, and empirical hypotheses extracted from the **Reel Engine Design Document v0.1** that require experimental validation or explicit project owner decisions.

---

## 1. Empirical Pacing & Pacing Heuristics (Design Doc §2.2, §13)
- **Question:** Do the generic short-form pacing heuristics (e.g. visual change every 1.5 to 3.0 seconds, 15/30/45 second target lengths) translate directly to animated explainers and mathematical visualizations, or do they cause visual overload?
- **Current Hypothesis:** Math animations (Manim) often require 4 to 6 seconds of continuous focal transformation without cuts to allow cognitive comprehension, whereas kinetic text explainers (Remotion) demand rapid cuts every 2 seconds.
- **Verification Experiment:** Render an identical educational script under two pacing presets: `punchy` (change every 1.5s) and `calm` (change every 3.5s) and evaluate viewer comprehension and visual clutter.

---

## 2. Reading Speed vs Caption Word Count (§8)
- **Question:** Is the 17 to 20 characters per second subtitling standard sufficient for vertical reels where viewers read short phrase blocks while simultaneously processing dynamic background animations?
- **Risk:** Fast-moving kinetic captions may pass the character-per-second linter but overwhelm viewers when competing with complex graphics.
- **Verification Method:** Test caption blocks of 3, 5, and 7 words against various font sizes and display durations, measuring dwell time and visual hierarchy.

---

## 3. Platform Safe Zone Drift & Locale Variation (§2.1, §4.1, §13)
- **Question:** How frequently does Meta update the interface elements on Instagram Reels, and how significantly do UI margins vary across iOS vs Android vs web preview?
- **Risk:** Hardcoding static percentages (top 14%, bottom 35%, side 6%) risks obsolescence or false positives on specific mobile devices.
- **Mitigation:** Safe zone coordinates must be strictly isolated in project preset JSON files with explicit `last_verified_date` metadata, never hardcoded in engine source.

---

## 4. Agent Creative Latitude: "Strict Presets" vs "Freeform Invention" (§13)
- **Question:** Should the MCP server and skill strictly restrict the coding agent to a closed catalog of pre-tested layouts and transitions, or allow the agent to write arbitrary custom CSS/Remotion/Manim elements?
- **Trade-off:**
  - *Strict Mode:* Guarantees high visual polish, zero safe-zone violations, and predictable render times; limits agent creativity.
  - *Freeform Mode:* Enables unexpected, highly creative visual metaphors; increases the rate of linter failures, clobbered layouts, and render crashes.
- **Recommendation:** Implement a configuration flag: `agent_creative_mode: "strict" | "guided" | "freeform"`, defaulting to `strict` for v0.1 MVP.

---

## 5. Remotion Commercial Licensing Terms (§9.2, brief Principle 8)
- **Question:** What are Remotion's current commercial licensing requirements for teams and automated video generation engines?
- **Licensing Constraint:** Remotion is licensed under its own "Remotion License" (Company License required for companies with more than 3 people or $>0 revenue, or automated SaaS video generation).
- **Architecture Implication:** The engine's renderer interface must remain strictly modular so that Remotion is treated as an interchangeable adapter, allowing alternative web-to-video renderers (e.g., Puppeteer/Canvas, Motion Canvas, or pure FFmpeg) to be plugged in if licensing terms dictate.
