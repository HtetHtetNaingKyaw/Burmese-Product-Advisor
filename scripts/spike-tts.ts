/**
 * Phase 1 compatibility proof for local Burmese text-to-speech.
 *
 *   pnpm models:fetch
 *   pnpm spike:tts
 *
 * Loads the MMS-TTS Burmese VITS graph with @huggingface/transformers
 * (onnxruntime-node under the hood) and writes a playable WAV file.
 * No Python, no cloud API.
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env as hfEnv, pipeline } from "@huggingface/transformers";
import { env } from "../lib/env";
import { encodeWav } from "./lib/media";

const modelsDir = path.resolve(process.cwd(), env.MODELS_DIR);
const modelDir = path.join(modelsDir, "mms-tts-mya");
const outputPath = path.join(process.cwd(), "storage", "out", "mms-tts-sample.wav");

const TEXT = "မင်္ဂလာပါ။ ဒီထုတ်ကုန်က ကောင်းတယ်။";

async function main() {
  // Everything is on disk: never fall back to a remote hub.
  hfEnv.allowRemoteModels = false;
  hfEnv.allowLocalModels = true;
  hfEnv.localModelPath = modelsDir + path.sep;

  console.log(`Model: ${modelDir}`);
  console.log(`Text:  ${TEXT}`);

  const started = performance.now();
  const synthesizer = await pipeline("text-to-speech", "mms-tts-mya", {
    dtype: "fp32",
  });
  console.log(`Pipeline loaded in ${(performance.now() - started).toFixed(0)} ms`);

  const result = (await synthesizer(TEXT)) as {
    audio?: Float32Array | number[];
    sampling_rate?: number;
    samplingRate?: number;
  };

  const audio = result.audio;
  if (!audio) {
    throw new Error(`Unexpected result shape: ${JSON.stringify(Object.keys(result))}`);
  }

  const samples = audio instanceof Float32Array ? audio : Float32Array.from(audio);
  const sampleRate = result.sampling_rate ?? result.samplingRate ?? 16000;

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, encodeWav(samples, sampleRate));

  console.log(
    `Wrote ${outputPath} — ${(samples.length / sampleRate).toFixed(2)}s @ ${sampleRate} Hz`,
  );
  console.log(`Open it in a browser or media player to listen.`);
}

main().catch((error) => {
  console.error("\nTTS spike failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
