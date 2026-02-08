/**
 * Convert WebM/Opus (or other formats) to PCM s16le mono at 16kHz using ffmpeg.
 * Used so we can send PCM to Gradium STT WebSocket.
 * Requires ffmpeg to be installed on the system.
 */

import { spawn } from "child_process";
import { createWriteStream, unlinkSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const SAMPLE_RATE = 16000;
const CHANNELS = 1;

export interface WebmToPcmResult {
  pcm: Buffer;
  sampleRate: number;
}

/**
 * Convert WebM (or Opus/other) audio buffer to PCM s16le mono at 16kHz.
 * Writes to a temp file, runs ffmpeg, reads stdout. Rejects if ffmpeg fails or is missing.
 */
export function webmToPcm(audioBuffer: Buffer): Promise<WebmToPcmResult> {
  return new Promise((resolve, reject) => {
    const tmpDir = tmpdir();
    const inputPath = join(tmpDir, `stt-in-${Date.now()}-${Math.random().toString(36).slice(2)}.webm`);
    const outputPath = join(tmpDir, `stt-out-${Date.now()}-${Math.random().toString(36).slice(2)}.raw`);
    const cleanup = () => {
      try {
        if (existsSync(inputPath)) unlinkSync(inputPath);
        if (existsSync(outputPath)) unlinkSync(outputPath);
      } catch (_) {}
    };

    const writeStream = createWriteStream(inputPath);
    writeStream.on("error", (err) => {
      cleanup();
      reject(err);
    });
    writeStream.on("finish", () => {
      writeStream.close();
      const ff = spawn("ffmpeg", [
        "-y",
        "-i", inputPath,
        "-f", "s16le",
        "-acodec", "pcm_s16le",
        "-ar", String(SAMPLE_RATE),
        "-ac", String(CHANNELS),
        outputPath,
      ], { stdio: ["ignore", "pipe", "pipe"] });

      const stderrChunks: Buffer[] = [];
      ff.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

      ff.on("error", (err) => {
        cleanup();
        reject(new Error(`ffmpeg not available: ${err.message}. Install ffmpeg to use Gradium STT.`));
      });

      ff.on("close", (code) => {
        if (code !== 0) {
          const stderr = Buffer.concat(stderrChunks).toString("utf8").slice(-500);
          cleanup();
          reject(new Error(`ffmpeg failed (${code}). ${stderr}`));
          return;
        }
        let pcm: Buffer;
        try {
          pcm = readFileSync(outputPath);
        } catch (e) {
          cleanup();
          reject(e);
          return;
        }
        cleanup();
        resolve({ pcm, sampleRate: SAMPLE_RATE });
      });
    });
    writeStream.write(audioBuffer);
    writeStream.end();
  });
}
