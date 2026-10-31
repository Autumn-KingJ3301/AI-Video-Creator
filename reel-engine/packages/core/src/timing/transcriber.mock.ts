import { AudioAnalyzer } from "./audio-analyzer.js";
import { WordTimestamp } from "./contracts.js";
import { AudioTranscriber, TranscriptionResult } from "./transcriber.interface.js";

export class DeterministicAligner implements AudioTranscriber {
  readonly name = "deterministic-aligner";
  private analyzer = new AudioAnalyzer();

  async transcribe(audioPath: string, scriptHint?: string): Promise<TranscriptionResult> {
    const duration_s = this.analyzer.getDuration(audioPath);
    
    // Fallback script if none supplied
    const text = (scriptHint && scriptHint.trim().length > 0)
      ? scriptHint.trim()
      : "AI generated code? Get a code audit. Launch confidently.";

    const rawWords = text.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) {
      return {
        text: "",
        words: [],
        duration_s,
        language: "en",
      };
    }

    // Allocate word durations proportionally based on character length and punctuation pauses
    const wordWeights: number[] = [];
    for (const w of rawWords) {
      let weight = Math.max(1, w.replace(/[^a-zA-Z0-9]/g, "").length);
      // Extra weight for punctuation pauses (sentence or clause boundary)
      if (/[.,!?;:]$/.test(w)) {
        weight += 2;
      }
      wordWeights.push(weight);
    }

    const totalWeight = wordWeights.reduce((a, b) => a + b, 0);

    // Leave small padding (5%) at start and end of track
    const usableDuration = Math.max(0.2, duration_s * 0.90);
    const startOffset = duration_s * 0.05;

    let currentTime = startOffset;
    const words: WordTimestamp[] = [];

    for (let i = 0; i < rawWords.length; i++) {
      const rawWord = rawWords[i];
      const weight = wordWeights[i];
      const wordDuration = (weight / totalWeight) * usableDuration;
      
      const cleanWord = rawWord.replace(/[.,!?;:]/g, "");
      const isPauseAfter = /[.,!?;:]$/.test(rawWord);
      
      // Speech portion is 85% of slot (15% micro-pause between words)
      const speechDuration = isPauseAfter ? wordDuration * 0.70 : wordDuration * 0.85;
      const end_s = Math.min(duration_s, currentTime + speechDuration);

      words.push({
        word: cleanWord,
        start_s: Number(currentTime.toFixed(3)),
        end_s: Number(end_s.toFixed(3)),
        confidence: 0.98,
      });

      currentTime += wordDuration;
    }

    return {
      text,
      words,
      duration_s,
      language: "en",
    };
  }
}
