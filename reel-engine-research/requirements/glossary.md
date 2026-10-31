# Reel Engine Domain Glossary

A precise technical glossary defining key terms used across the Reel Engine architecture, design document, and implementation plan.

---

### **Scene**
A distinct temporal, semantic, and narrative segment of a video defined by a single entry in the Scene IR. Every scene has an integer start and end frame, a dedicated renderer (`remotion` or `manim`), an isolated source code file (`scene_s01.tsx` or `scene_s01.py`), and renders to an independent, mute video clip.

### **Beat**
A narrative sub-unit within a scene or video that introduces a single atomic fact, step, or visual development toward the payoff. In the Scene IR, a `beat` is also a canonical scene type (typical length 3 to 6 seconds) with one focal element and one label.

### **Shot**
The visual framing, camera angle, and layout configuration of a scene. Multiple visual events may occur within a single shot without cutting.

### **Event (Visual Event)**
A registered, frame-accurate landmark within a scene indicating that the visible screen has changed. Event kinds include `element_in`, `text_event`, `motion_change`, and `cut`. The engine uses the event schedule to evaluate the visual change budget and static limits.

### **Transition**
The visual link between two adjacent scenes. Transitions range from 0-frame `hard_cut` to heavier animations such as `zoom_punch` (6–10f), `swipe` (8–12f), and `mask_reveal` (10–15f). Transitions are subject to a strict project frequency budget (`max_heavy_per_10s`).

### **Preset**
A named, versioned bundle of default parameters organized into independent layers: Format (canvas, safe zones), Duration (target runtime), Pacing (cut frequencies, static limits), Style (colors, typography, easing), Captions, Transitions, Audio, and Export.

### **Asset**
A media file (image, icon, font, audio stem, 3D model, or pre-rendered video) referenced by a scene. All assets are content-addressed and stored in the project asset directory.

### **Composition**
The server-side assembly process (executed via FFmpeg) that concatenates independent scene clips in timeline sequence, overlays and burns synchronized caption graphics, mixes the master narration track with background music (applying audio ducking and loudness normalization), and generates the final video file.

### **Verified**
The formal state of a project where all rendered scene clips have passed 100% of the deterministic blocking quality gates (no render errors, exact frame counts, hook deadline met, static limits respected, safe zone compliance, audio loudness at -14 LUFS, and transition budgets preserved), and the creative self-review rubric has been submitted with no failing scores. Only verified projects may proceed to the `composed` phase.

### **Non-Destructive Edit List**
A lightweight data structure in project state (`edit` section) that records post-production adjustments: trimming in/out frames, scene reordering, enabling/disabling scenes, and aspect ratio overrides. These adjustments are applied during FFmpeg export without modifying or re-rendering the underlying scene clips.

### **Safe Zone**
The rectangular region of a vertical 9:16 canvas guaranteed to be unobscured by social platform interface elements (headers, search bars, creator handles, audio labels, and action rails like like/share/remix). On a 1080x1920 canvas, the Reels safe zone leaves 14% top (269px), 35% bottom (672px), and 6% sides (65px) clear.
