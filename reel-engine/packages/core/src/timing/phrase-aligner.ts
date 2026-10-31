import { WordTimestamp, PhraseSegment } from "./contracts.js";

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or", "but", "is", "are",
  "was", "were", "be", "been", "by", "with", "from", "as", "it", "this", "that", "your",
  "my", "our", "their", "so", "if", "not", "no", "do", "does", "did", "have", "has", "had"
]);

export interface PhraseAlignerOptions {
  maxWords?: number;
  readingSpeedCps?: number;
  fps?: number;
}

export class PhraseAligner {
  /**
   * Groups word-level timestamps into natural phrase blocks (<= maxWords per phrase),
   * selects a salient keyword for terracotta highlighting, and computes frame boundaries.
   */
  alignPhrases(words: WordTimestamp[], options: PhraseAlignerOptions = {}): PhraseSegment[] {
    const maxWords = options.maxWords ?? 7;
    const readingSpeedCps = options.readingSpeedCps ?? 18;
    const fps = options.fps ?? 30;

    if (!words || words.length === 0) return [];

    const phrases: PhraseSegment[] = [];
    let currentWords: WordTimestamp[] = [];
    let phraseIndex = 1;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      currentWords.push(w);

      const isLastWord = i === words.length - 1;
      const reachedMax = currentWords.length >= maxWords;
      const endsClause = /[.,!?;:]$/.test(w.word);

      if (isLastWord || reachedMax || endsClause) {
        const text = currentWords.map(item => item.word).join(" ");
        const start_s = currentWords[0].start_s;
        let end_s = currentWords[currentWords.length - 1].end_s;

        // Ensure phrase dwell time respects minimum reading speed
        const minDwellSeconds = text.length / readingSpeedCps;
        if (end_s - start_s < minDwellSeconds) {
          end_s = start_s + minDwellSeconds;
        }

        const keyword = this.selectKeyword(currentWords);

        const start_frame = Math.round(start_s * fps);
        const end_frame = Math.round(end_s * fps);

        phrases.push({
          id: `p${String(phraseIndex).padStart(2, "0")}`,
          text,
          words: [...currentWords],
          start_s: Number(start_s.toFixed(3)),
          end_s: Number(end_s.toFixed(3)),
          start_frame,
          end_frame: Math.max(start_frame + 1, end_frame),
          keyword,
        });

        phraseIndex++;
        currentWords = [];
      }
    }

    return phrases;
  }

  /**
   * Selects the most salient word from a phrase for kinetic keyword highlighting.
   */
  private selectKeyword(words: WordTimestamp[]): string {
    if (words.length === 0) return "";
    
    // Filter out common stopwords and find longest salient word
    const candidates = words
      .map(w => w.word.replace(/[^a-zA-Z0-9]/g, ""))
      .filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));

    if (candidates.length === 0) {
      // Fallback to the longest word in the phrase
      return words.reduce((prev, curr) => (curr.word.length > prev.word.length ? curr : prev)).word;
    }

    // Pick the longest candidate word
    return candidates.reduce((prev, curr) => (curr.length > prev.length ? curr : prev));
  }
}
