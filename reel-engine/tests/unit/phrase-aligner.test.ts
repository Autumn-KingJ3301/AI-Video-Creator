import { describe, it, expect } from "vitest";
import { PhraseAligner } from "../../packages/core/src/timing/phrase-aligner.js";
import { WordTimestamp } from "../../packages/core/src/timing/contracts.js";

describe("PhraseAligner Unit Tests", () => {
  const aligner = new PhraseAligner();

  it("should chunk words into phrase blocks of at most maxWords", () => {
    // 12 words with a punctuation mark in the middle
    const words: WordTimestamp[] = [
      { word: "AI", start_s: 0.1, end_s: 0.3, confidence: 0.99 },
      { word: "generated", start_s: 0.35, end_s: 0.8, confidence: 0.99 },
      { word: "code?", start_s: 0.85, end_s: 1.2, confidence: 0.99 },
      { word: "Get", start_s: 1.3, end_s: 1.5, confidence: 0.99 },
      { word: "an", start_s: 1.55, end_s: 1.7, confidence: 0.99 },
      { word: "expert", start_s: 1.75, end_s: 2.1, confidence: 0.99 },
      { word: "code", start_s: 2.15, end_s: 2.4, confidence: 0.99 },
      { word: "audit", start_s: 2.45, end_s: 2.8, confidence: 0.99 },
      { word: "before", start_s: 2.85, end_s: 3.1, confidence: 0.99 },
      { word: "launching", start_s: 3.15, end_s: 3.6, confidence: 0.99 },
      { word: "your", start_s: 3.65, end_s: 3.8, confidence: 0.99 },
      { word: "product.", start_s: 3.85, end_s: 4.3, confidence: 0.99 },
    ];

    const phrases = aligner.alignPhrases(words, { maxWords: 6, fps: 30 });

    expect(phrases.length).toBeGreaterThanOrEqual(2);
    for (const p of phrases) {
      expect(p.words.length).toBeLessThanOrEqual(6);
      expect(p.start_frame).toBeLessThan(p.end_frame);
      expect(p.keyword).toBeDefined();
      expect(p.keyword.length).toBeGreaterThan(0);
    }

    // First phrase should break at "code?" due to punctuation
    expect(phrases[0].text).toBe("AI generated code?");
    expect(phrases[0].keyword.toLowerCase()).toBe("generated");
  });

  it("should ensure minimum reading dwell time based on characters per second", () => {
    // Very fast single word with high char count
    const words: WordTimestamp[] = [
      { word: "Confidentiality", start_s: 0.1, end_s: 0.2, confidence: 0.95 },
    ];

    const phrases = aligner.alignPhrases(words, { maxWords: 7, readingSpeedCps: 18, fps: 30 });
    expect(phrases.length).toBe(1);
    // 15 chars / 18 cps = ~0.83s min dwell
    expect(phrases[0].end_s - phrases[0].start_s).toBeGreaterThanOrEqual(0.8);
  });

  it("should identify salient keywords and skip common stopwords", () => {
    const words: WordTimestamp[] = [
      { word: "In", start_s: 0.0, end_s: 0.2, confidence: 0.9 },
      { word: "the", start_s: 0.2, end_s: 0.4, confidence: 0.9 },
      { word: "first", start_s: 0.4, end_s: 0.7, confidence: 0.9 },
      { word: "production", start_s: 0.7, end_s: 1.3, confidence: 0.9 },
      { word: "release", start_s: 1.3, end_s: 1.8, confidence: 0.9 },
    ];

    const phrases = aligner.alignPhrases(words, { maxWords: 7, fps: 30 });
    expect(phrases[0].keyword.toLowerCase()).toBe("production");
  });
});
