import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { AudioAnalyzer } from "./audio-analyzer.js";
import { WordTimestamp } from "./contracts.js";
import { AudioTranscriber, TranscriptionResult } from "./transcriber.interface.js";
import { DeterministicAligner } from "./transcriber.mock.js";

const execFileAsync = promisify(execFile);

export class WhisperTranscriber implements AudioTranscriber {
  readonly name = "whisper-transcriber";
  private analyzer = new AudioAnalyzer();
  private fallback = new DeterministicAligner();

  async transcribe(audioPath: string, scriptHint?: string): Promise<TranscriptionResult> {
    const duration_s = this.analyzer.getDuration(audioPath);

    // Try executing local Python whisper/faster-whisper worker if python is available
    const pythonBin = process.env.PYTHON_BIN || "python";

    const workerScript = `
import sys, json
try:
    import faster_whisper
    model = faster_whisper.WhisperModel("base", device="auto", compute_type="default")
    segments, info = model.transcribe(sys.argv[1], word_timestamps=True)
    words = []
    full_text = []
    for s in segments:
        full_text.append(s.text)
        for w in (s.words or []):
            words.append({"word": w.word.strip(), "start_s": round(w.start, 3), "end_s": round(w.end, 3), "confidence": round(w.probability, 2)})
    print(json.dumps({"text": " ".join(full_text).strip(), "words": words, "language": info.language}))
except Exception as e:
    sys.exit(1)
`;

    const tempPyPath = join(process.cwd(), `whisper_probe_${Date.now()}.py`);
    try {
      writeFileSync(tempPyPath, workerScript, "utf-8");
      const { stdout } = await execFileAsync(pythonBin, [tempPyPath, audioPath], { timeout: 30000 });
      if (existsSync(tempPyPath)) unlinkSync(tempPyPath);

      const parsed = JSON.parse(stdout);
      return {
        text: parsed.text,
        words: parsed.words,
        duration_s,
        language: parsed.language || "en",
      };
    } catch {
      if (existsSync(tempPyPath)) {
        try { unlinkSync(tempPyPath); } catch {}
      }
      // Graceful fallback to deterministic alignment
      return this.fallback.transcribe(audioPath, scriptHint);
    }
  }
}
