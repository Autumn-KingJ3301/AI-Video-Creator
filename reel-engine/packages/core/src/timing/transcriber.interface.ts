import { WordTimestamp } from "./contracts.js";

export interface TranscriptionResult {
  text: string;
  words: WordTimestamp[];
  duration_s: number;
  language?: string;
}

export interface AudioTranscriber {
  readonly name: string;
  transcribe(audioPath: string, scriptHint?: string): Promise<TranscriptionResult>;
}
