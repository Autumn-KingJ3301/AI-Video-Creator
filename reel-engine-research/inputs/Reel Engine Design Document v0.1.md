# Reel Engine: Design Document v0.1

How the video engine plans, renders and checks short-form videos, with reels as the first target.

## 1. Purpose and scope

The engine turns a script or voice-over into a finished vertical video. A coding agent (Codex, Claude Code, Antigravity) acts as the **director**. Our MCP server and local UI are the **production crew**: they hold the rules, render the scenes, check the result, and handle everything that is not creative.

This document covers:

- what research says makes reels work (and how reliable that evidence is)
- the director's doctrine, written as rules an agent can follow
- presets and the configuration model
- the scene model, timing system, transitions and typography
- renderer architecture and the quality gates
- how the MCP state machine and the skill steer the agent

Out of scope for v0.1: publishing to platforms, analytics ingestion, multi-language typography, and the UI layout details.

**Core bet:** coding agents are weak creative directors when they have too many free choices. So the engine gives them a small set of named, tested choices (presets, scene types, transitions, layouts) and a checklist to judge their own work. Creativity comes from combining a few good building blocks well, not from inventing everything per video.

## 2. What the research says

I searched for current reels guidance in October 2026. Most of it comes from creator-tool blogs and agencies, not from Instagram itself, so each finding is graded. The only hard platform numbers are Meta's published safe zones.

### 2.1 Findings and confidence

| Finding | Confidence | Engine implication |
| --- | --- | --- |
| Instagram's head has named three top ranking signals: watch time, likes per reach, and sends per reach (DM shares). Watch time matters most across surfaces. | High (widely reported, from his January 2025 statements) | Optimize for retention first, then for "send this to a friend" moments. |
| Sends carry roughly 3 to 5 times the weight of likes for reaching non-followers. | Low to medium. The multiplier is repeated by many guides, but one review found no primary source for it, and the original wording was softer ("slightly more important"). | Treat sends as important, but do not hard-code the multiplier into anything. |
| The first 1 to 3 seconds decide whether viewers stay. Sources give hook windows from 0.5 s (ads) to 1.5 s to 3 s. | Medium. All agree the hook must be immediate; exact numbers vary. | Hook must land within 1 second, and be complete by 3 seconds. |
| One idea per reel, delivered fully. The shortest version that carries the idea beats a padded one. | Medium (consistent across sources) | Scene planner must reduce a script to one core idea per video. |
| Practical lengths: 7 to 15 s for a single tip or visual, 15 to 30 s for one idea with a beginning, middle and end, longer only when retention holds. | Medium. Sources differ (some suggest 21 to 34 s or up to 60 s) and say length depends on goal. | Default targets of 15, 30 and 45 s, with length as a preset setting, never a hard rule. |
| Visual change every 1 to 3 seconds keeps attention: a cut, zoom, text pop-up, crop change or B-roll. | Medium (heuristic repeated by many editors) | Enforce a "visual change budget" in the linter. |
| Many viewers watch without sound, so on-screen text and captions are needed. Keep text blocks short (about 6 to 8 words), high contrast, phrase-based rather than word-by-word. | Medium | Captions are a required layer, designed as part of the visuals. |
| A static single shot for 20 seconds loses a large share of viewers by the halfway point (one practitioner reports 30 to 40 percent). | Low (anecdotal) | Supports the visual-change rule; do not quote the number as fact. |
| A reel holding 60 percent or more of viewers past the 3-second mark is a strong signal. | Low (secondary source, no platform confirmation) | Use as an internal target to test against, not a rule. |
| Meta publishes a Reels safe zone for 1080 x 1920: about 14% top, 35% bottom, 6% on each side stay clear of interface elements. | High (published by Meta) | Hard constraint for text and key visuals. |
| Instagram also crops reels in other places: the profile grid shows a 3:4 crop (about 240 px removed top and bottom of 1080 x 1920) and the feed can show a 4:5 preview. | Medium | The hook frame and any cover-worthy frame must survive a center 3:4 crop. |
| Platform length limits have grown (one source lists up to 3 minutes in the in-app camera). | Medium; limits change | Make max length a config value and re-check before release. |

### 2.2 What we do not know

- No source gave a reliable cut-rate for animated explainers specifically. Most pacing advice is written for talking-head or travel footage. Animation tolerates (and sometimes needs) different rhythms, so our pacing presets must be tested against real retention data.
- Retention thresholds and ranking weights are not published by the platform. All numeric targets in this document are design defaults, to be tuned.

## 3. The director's doctrine

These are the rules the skill teaches the agent. Each one is phrased so it can also be checked automatically where possible.

1. **One idea.** Before planning anything, write the idea as a single sentence. If it needs "and", split it into two reels.
2. **Promise first.** The first frame states or visualizes the payoff or the question. No logos, intros or warm-up.
3. **Hook lands in 1 second, completes by 3.** Frame 1 must already contain a visual or text event. By second 3 the viewer knows what they will get.
4. **Something changes every 1.5 to 3 seconds.** Cut, zoom, text event, element entrance, color shift. Never leave the screen unchanged for longer than the preset's static limit.
5. **Every second earns the next.** Cut any sentence or shot that does not move the viewer toward the payoff.
6. **Visuals show, text names.** Use the animation to demonstrate; use short text to label and emphasize. Do not narrate over a wall of text.
7. **Design for sound off.** Captions and key text must carry the meaning without audio.
8. **Stay in the safe zone.** All text and key visuals sit inside the safe area. The hook frame survives a center 3:4 crop.
9. **Build a send moment.** Include at least one beat a viewer would want to forward: a surprising fact, a relatable pain point, a screenshot-worthy frame.
10. **End on the payoff, not on a goodbye.** Finish with the result or a one-line takeaway. If a call to action is used, keep it to one and make it short.
11. **Design the loop.** Where it makes sense, make the last frame connect to the first so replays feel natural.
12. **Consistent motion language.** One easing family, one transition family, one palette per video. Variety comes from layouts and pacing, not from mixing styles.
13. **Template first, invent second.** Use the preset's scene layouts and transitions. Invent a new element only when no preset fits and the brief needs it.

## 4. Presets and configuration

Everything the user or agent can tune lives in one project configuration. Presets are named bundles of defaults, and every value can be overridden.

### 4.1 Configuration model

```json
{
  "format": {
    "preset": "reel_9x16",
    "width": 1080, "height": 1920, "fps": 30,
    "safe_zone": { "top": 0.14, "bottom": 0.35, "side": 0.06 },
    "center_crop_check": "3:4"
  },
  "duration": { "target_s": 30, "min_s": 15, "max_s": 45 },
  "pacing": {
    "preset": "punchy",
    "hook_deadline_s": 1.0,
    "hook_complete_s": 3.0,
    "change_interval_s": [1.5, 3.0],
    "max_static_s": 2.5
  },
  "style": {
    "preset": "clean_dark",
    "palette": ["#0B0F1A", "#F5F7FA", "#4DA3FF", "#FFC857"],
    "fonts": { "display": "...", "body": "..." },
    "motion": "snappy"
  },
  "captions": {
    "mode": "phrase", "max_words": 7,
    "position": "upper_mid", "highlight": "keyword"
  },
  "transitions": {
    "allowed": ["hard_cut", "zoom_punch", "swipe", "mask_reveal", "match_cut"],
    "max_heavy_per_10s": 1
  },
  "audio": { "loudness_lufs": -14, "duck_music_db": -12, "tighten_pauses_s": 0.35 },
  "export": { "draft": "540x960@24", "final": "1080x1920@30", "codec": "h264", "container": "mp4" }
}
```

The values above are starting points. Loudness, pause tightening and draft settings are conventions from general video practice, not from the research above, and should be tuned by testing.

### 4.2 Preset layers

Presets are independent layers, so users can mix them:

- **Format preset**: canvas, fps, safe zones, crop checks (reel 9:16 first; later 1:1, 4:5, 16:9).
- **Duration preset**: 15 s tip, 30 s explainer, 45 s story.
- **Pacing preset**: punchy, balanced, calm (changes cut intervals, static limit, transition budget).
- **Style preset**: palette, fonts, motion feel, layout set.
- **Caption preset**: phrase captions, big keyword emphasis, minimal.

### 4.3 Starter catalog

| Preset | Length | Structure | Pacing | Best for |
| --- | --- | --- | --- | --- |
| Quick Tip | 15 s | Hook (0 to 2) / Tip (2 to 11) / Payoff (11 to 15) | punchy | single fact, trick or definition |
| Explainer | 30 s | Hook / Setup / 2 to 4 beats / Payoff / Loop | punchy to balanced | one concept with a visual demo |
| Story | 45 s | Hook / Context / Turn / Resolution | balanced | case study, before and after |
| Concept Animation | 30 to 45 s | Hook / Visual build / Reveal / Takeaway | balanced | math or science explainers (Manim-heavy) |

## 5. The scene model

The **Scene IR** (intermediate representation) is a JSON file with one entry per scene. The agent writes it, the server validates it, and every later stage reads it.

### 5.1 Scene types

| Type | Job | Typical length | Rules |
| --- | --- | --- | --- |
| Hook | Stop the scroll, promise the payoff | 1.5 to 3 s | Visual or text event in frame 1; complete by 3 s; no intro. |
| Setup | Give just enough context | 2 to 5 s | Skip entirely if the hook already did this. |
| Beat | Deliver one piece of the idea | 3 to 6 s | One focal element, one label, one motion. |
| Proof | Show it working: demo, data, before and after | 3 to 6 s | Prefer animation over text. |
| Reset | Pattern interrupt before attention drifts | 1 to 2 s | Used when a beat would run longer than the change interval allows. |
| Payoff | Resolution or takeaway | 3 to 5 s | Ends on the answer, not a sign-off. |
| CTA / Loop | Optional single action, or loop back to frame 1 | 1 to 3 s | One action only. |

### 5.2 Scene fields

```json
{
  "id": "s03",
  "type": "beat",
  "start_frame": 150, "end_frame": 255,
  "narration": "Because the gradient points uphill...",
  "intent": "show gradient vector on a surface",
  "renderer": "manim",
  "layout": "focal_center_label_top",
  "transition_in": "zoom_punch",
  "events": [ { "frame": 150, "kind": "element_in" }, { "frame": 190, "kind": "text_event" } ],
  "assets": [],
  "send_moment": false
}
```

The `events` list is how the engine knows when the screen changes. The linter uses it to check the visual change budget.

## 6. Timing system

1. **Audio is the master clock.** Whisper-class transcription gives word timestamps. All scene boundaries are computed from the audio, never typed in by hand.
2. **Work in frames, not seconds.** Store every time as an integer frame at the project fps, so scenes and audio can never drift.
3. **Optional pause tightening.** Remove silences longer than the preset threshold before planning, so pacing is set by the tightened track.
4. **Snap cuts to speech.** Scene boundaries land at phrase ends. A small lead (cut a few frames before the last word fades) usually feels tighter than cutting exactly on silence. Treat the lead as a tunable parameter.
5. **Scene duration = narration length + padding.** Scenes without narration (resets, hooks) are allowed, but total runtime still follows the audio plus any planned breathing room.
6. **Change-interval budget.** For every stretch of the timeline, the planner must place a visual event at least as often as the pacing preset requires. The server rejects plans that exceed the static limit.
7. **Beat grid (optional).** If music is used, snap major transitions to beats within a small tolerance.

## 7. Transitions and motion

The values here are our design defaults. They come from general motion-design practice, not from the research table, so treat them as the first thing to test and tune.

### 7.1 Transition library (v0)

| Name | Use for | Length | Notes |
| --- | --- | --- | --- |
| hard\_cut | default between beats | 0 frames | Most transitions should be this. |
| zoom\_punch | emphasis, entering a key moment | 6 to 10 frames | Scale up with fast ease-out; avoid on consecutive cuts. |
| swipe / push | moving to the next step in a sequence | 8 to 12 frames | Direction should match the logic (next = left). |
| mask\_reveal | revealing an answer or result | 10 to 15 frames | Good for payoffs. |
| match\_cut | linking two scenes by shape or position | 0 to 6 frames | Needs layout planning; high value, use for the hook to first beat or the loop. |
| morph (Manim Transform) | showing one thing becoming another | 15 to 30 frames | Conceptual transitions in math and science. |
| glitch / shutter | pattern interrupts for hooks | 4 to 8 frames | Rare. At most once per video. |

Rules: a heavy transition (anything except hard\_cut and match\_cut) is limited by the preset's `max_heavy_per_10s`. Every transition must be motivated by the content, not by variety for its own sake.

### 7.2 Motion principles

- Entrances ease out (fast start, soft landing); exits ease in; moves ease in-out.
- Entrance animations run roughly 6 to 12 frames at 30 fps. Longer feels sluggish on a phone.
- Stagger grouped elements by 2 to 4 frames so the eye can follow.
- One focal motion at a time. If two things move, one of them is secondary and slower.
- Overshoot or spring motion only for emphasis, and only in "snappy" motion presets.
- Every text element must hold still, fully settled, for its reading time plus a short margin before leaving.

## 8. Typography and captions

- **Safe area:** all text inside the safe zone from the config (top 14%, bottom 35%, sides 6% on a 1080 x 1920 canvas). Put the hook text in the upper-middle, which is clear of both the header and the caption area. Primary text should also sit inside the center 3:4 region.
- **Phrase captions, not word-by-word,** with a keyword highlight. Cap each block at about 7 words.
- **Reading speed:** the linter checks that each text block stays on screen long enough to read. A reasonable default from subtitling practice is around 17 to 20 characters per second of display time; tune per preset.
- **Contrast:** minimum contrast ratio checked against the actual background pixels in the sampled frame, not just the palette values.
- **Size:** body text no smaller than a preset minimum at 1080 px width. Designed for phone viewing first.
- **Hierarchy:** one headline, one supporting line, at most one tag or label per scene.
- **Text events as retention anchors:** a keyword, a step number or an underline can serve as the "visual change" required by the pacing rule.

## 9. Renderer architecture

### 9.1 Pipeline

```
Input (audio or script)
  -> Transcribe + word timestamps        (server, Whisper)
  -> Analyze, choose idea, hook, beats   (agent)
  -> Scene IR                            (agent writes, server validates)
  -> Scene code, one file per scene      (agent)
  -> Render each scene to a clip         (server)
  -> Inspect: lint + frame sampling      (server, optional vision check)
  -> Compose: clips + audio + captions   (server, ffmpeg)
  -> Export                              (server, edit list applied)
```

### 9.2 Renderer routing

- **Manim**: math, graphs, geometry, anything showing a transformation.
- **Remotion (React)**: text-heavy motion graphics, UI mockups, charts, caption layers, most general scenes.
- Each scene picks one renderer via the IR. Scenes render to independent clips, so mixing is safe, but one video must share the same style tokens (palette, fonts, easing) across renderers.
- A shared **helper library** in each renderer exposes the same concepts: canvas size, safe area, layouts, caption blocks, transitions, easing curves, and a `scene(duration_frames)` wrapper. Agents write against this small API, not against raw Manim or Remotion.

### 9.3 Determinism and quality

- Pin library versions and bundle fonts, so renders are repeatable.
- Seed any randomness.
- Draft renders (small, low fps) during iteration; full-quality only on export.
- Cache each scene clip by the hash of its IR entry, code, style tokens and audio slice, so edits re-render only what changed.
- Burn captions in during compose, since a styled caption layer is part of the design.
- Render sandboxed: no network access, restricted file system.

### 9.4 Post-production (UI and MCP, not the agent)

Trim in and out points, scene order and enabled flags, aspect ratio and resolution, and export presets live in a separate `edit` section of project state and are applied only at export, as a non-destructive edit list. Changing the aspect ratio triggers a re-render, which works only if the helper library lays out relative to the canvas, so layouts must be responsive by construction.

## 10. The director skill

The skill is a folder that the agent reads, and the same content is served through the MCP prompts and tool results.

### 10.1 Contents

- **Workflow:** brief, idea, hook options, beat sheet, Scene IR, scene code, render, inspect, fix, compose.
- **Doctrine:** section 3 of this document, verbatim.
- **Catalog:** scene types, layouts, transitions, style tokens, with an example of each.
- **Worked examples:** two or three complete, good projects (brief, IR, scene code, final lint report) per preset.
- **Anti-patterns:** a short list of common failures with before and after (slow intro, wall of text, text in the danger zone, unmotivated transition spam, a scene that never changes).
- **Self-review rubric** (below).

### 10.2 Steps the agent must follow

1. **Brief intake.** Capture the goal, audience, the single idea, the desired viewer action (send, save, follow), and the preset.
2. **Hook options.** Write three hooks from different families (bold claim, question, contrast or before-and-after, curiosity gap, visual shock). Score each with the rubric and pick one. Record the choice in the IR.
3. **Beat sheet.** Fit the script into the preset's time budget. Cut anything that does not serve the idea.
4. **Shot design.** For every scene, state the focal element, the motion, the label text, and the visual event times.
5. **Author scene code** using only the helper library and the style tokens.
6. **Render draft, inspect, fix** until the linter passes, with a retry limit per scene.
7. **Final self-review** against the rubric before the server allows compose.

### 10.3 Self-review rubric

Each item is scored 0 (fails), 1 (acceptable) or 2 (strong). The server requires no zeros and a minimum total.

| Item | Question |
| --- | --- |
| Hook | Is there a clear event in frame 1, and is the promise clear by second 3? |
| One idea | Can the video be summarized in one sentence without "and"? |
| Pacing | Does something change at least every 3 seconds? |
| Legibility | Is all text inside the safe zone, readable, and on screen long enough? |
| Motion | Is the motion language consistent, with one focal motion at a time? |
| Send moment | Is there a beat worth forwarding? |
| Payoff and loop | Does it end on the answer, and does the last frame connect back? |

## 11. Automated quality gates

The server runs these checks after each render and again before compose.

| Check | Method | Type |
| --- | --- | --- |
| Render completed, no errors | process result and logs | deterministic |
| Clip duration matches planned frames and audio slice | frame count | deterministic |
| Hook event exists by hook deadline | event times in IR plus frame difference | deterministic |
| Visual change interval within preset | IR events plus frame-difference analysis | deterministic |
| Static limit not exceeded | frame difference over a window | deterministic |
| Text inside safe zone and center crop | text bounding boxes from the renderer | deterministic |
| Text on-screen time vs reading speed | IR and caption timing | deterministic |
| Contrast on sampled frames | pixel sampling | deterministic |
| Elements clipped or off-canvas | bounds check | deterministic |
| Audio loudness and clipping | audio analysis | deterministic |
| Transition budget respected | IR | deterministic |
| Visual quality, clutter, "does it look good" | sampled frames sent to a vision model | model-based, advisory only |

Deterministic failures block compose. Vision-based findings are advisory, because model judgments of visual quality are inconsistent, and are shown to both the agent and the user.

## 12. MCP integration

### 12.1 Phases

`input` -> `transcribed` -> `planned` (IR valid) -> `authored` -> `rendered` -> `verified` -> `composed` -> `exported`

Each tool result returns `phase`, `status`, `next_step` and `blocked_by`. Out-of-order calls are refused with the correct next step. `get_next_step()` re-syncs an agent that lost track.

### 12.2 Tools (v0)

- `init_project(brief, preset)`
- `transcribe(audio)` and `tts(script)`
- `get_project_settings()` and `get_doctrine(topic)`
- `submit_plan(ir)` (validates the IR against the preset)
- `render_scene(id, draft)` and `render_status(job)`
- `inspect(id)` (returns the lint report and sampled frames)
- `submit_review(rubric)`
- `compose()` and `export(preset)`
- `get_next_step()`

### 12.3 Where the UI fits

The UI shows the phase, the scenes, the lint results and the preview, and offers the post-production controls. Its prompt panel generates the short bootstrap prompt for each phase (kickoff, continue, fix scene N, restyle), pointing the agent at the project and at `get_next_step`.

## 13. Risks and open questions

- **The numbers are heuristics.** Pacing and hook defaults come from general short-form advice and need testing on animated explainers. Plan an experiment: render the same script with two pacing presets and compare real retention graphs.
- **Agents may still write dull or cluttered scenes** even within constraints. Mitigation: strong worked examples, a small layout set, and the review gate. Measure how often drafts need fixes.
- **Vision-model checks are noisy.** Keep them advisory.
- **Music and sound effects:** licensing matters for published videos. Use only assets with clear licenses, and keep audio optional in the MVP.
- **Multi-language support:** caption fonts, line breaking and Whisper language settings need their own pass (for example, Indic scripts and mixed-language speech).
- **Platform changes:** safe zones, length limits and ranking guidance change. Keep platform facts in preset data, with a "last verified" date, not in code.
- **Aspect ratio changes after authoring** only work if the helper library is responsive.
- **Open question:** how much creative latitude should the user be able to turn on? A "strict preset" mode versus a "free" mode may be worth offering.

## 14. Build order for the engine

1. Config model, preset data files, and the Scene IR validator, with hand-written IR and scenes (no agent).
2. Helper libraries for Manim and Remotion: canvas, safe area, layouts, captions, transitions, easing.
3. Timing system: Whisper pipeline, frame-based scene boundaries, pause tightening.
4. Linter: the deterministic checks in section 11.
5. Compose and export with ffmpeg and the edit list.
6. MCP state machine, tools and `next_step` messages.
7. Director skill: doctrine, catalog, worked examples, rubric.
8. UI: preview, phase view, lint results, prompt panel, post-production controls.
9. Real-world tuning: produce a set of test reels, compare presets, adjust defaults.

## 15. Sources and how they were used

Research was gathered via web search on October 30, 2026. Findings are paraphrased and graded in section 2. Sources by topic:

- **Ranking signals:** coverage of Instagram head Adam Mosseri's January 2025 statements (Social Samosa and several marketing blogs); a recurpost review noting the lack of a primary source for the "3 to 5 times" claim.
- **Length and hooks:** Kontentino, quso.ai, Klap, captions.ai and Socialinsider guides.
- **Safe zones and crops:** safe-zone tables citing Meta's published margins (socialync.io, House of Marketers), plus Hopper HQ and invideo on profile-grid and feed crops.
- **Pacing, pattern interrupts, captions:** CapCut, Splice, faceless.so, influencers-time.com and an open video-pacing skill listing cut rates by platform.

Before release, re-verify platform facts directly against Meta's current documentation.
