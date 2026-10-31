# ADR-004: Audio Timing and Transcription Strategy

- **Status:** Accepted
- **Date:** 2026-10-30
- **Context:** High-retention reels require exact alignment between spoken phrases and visual cuts. Cuts that land mid-word or with awkward dead silences destroy video rhythm.
- **Decision:**
  1. **Audio is the Master Clock:** The total frame count and scene boundary candidates are derived directly from the voiceover audio.
  2. **Transcription Engine:** Use Whisper (via local `whisper-cli` / `whisper.cpp` or Kokoro/Whisper bundle) to extract word-level timestamps with start/end frames.
  3. **Pause Tightening:** An optional pre-planning filter detects unvoiced audio silences longer than `tighten_pauses_s` (default 0.35s) and trims them before scene planning.
  4. **Phrase Snap & Lead Frames:** Scene cut points automatically snap to phrase endings with a tunable lead of 2–4 frames before speech fades.
- **Consequences:**
  - *Positive:* Fast, punchy pacing with natural speech rhythms.
  - *Positive:* Pre-tightened audio ensures the agent plans against the actual tightened runtime.
  - *Trade-off:* Voice synthesis (TTS) or audio import must precede scene IR planning.
- **Evidence:** Follows `Reel Engine Design Document v0.1 §6` and `OpenMontage/lib/verify_scene_pacing.py`.
