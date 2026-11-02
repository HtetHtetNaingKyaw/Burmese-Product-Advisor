/**
 * Phase 1 compatibility proof for local Burmese speech-to-text.
 *
 *   pnpm models:fetch
 *   pnpm spike:stt
 *
 * Runs the 78 MB Conformer-CTC graph directly on onnxruntime-node.
 * No Python, no transformers.js required for this model.
 */
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as ort from "onnxruntime-node";
import { env } from "../lib/env";
import { convertTo16kWav, decodeWav } from "./lib/media";

const modelsDir = path.resolve(process.cwd(), env.MODELS_DIR);
const modelPath = path.join(modelsDir, "freococo", "freococo.onnx");
const vocabPath = path.join(modelsDir, "freococo", "vocab.json");
const sourceAudio = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(modelsDir, "samples", "example.mp3");
const wavPath = path.join(modelsDir, "samples", "input.16k.wav");

/** Collapse repeated CTC ids, drop blank (0), and map to syllables. */
function greedyCtcDecode(frameIds: number[], idToToken: Map<number, string>): string {
  const tokens: string[] = [];
  let previous = -1;

  for (const id of frameIds) {
    if (id !== 0 && id !== previous) {
      const token = idToToken.get(id);
      if (token) tokens.push(token);
    }
    previous = id;
  }

  return tokens.join(" ").replace(/\s+/g, " ").trim();
}

function argmaxFrames(logits: Float32Array, frames: number, vocab: number): number[] {
  const ids: number[] = [];
  for (let frame = 0; frame < frames; frame += 1) {
    let best = 0;
    let bestValue = logits[frame * vocab];
    for (let token = 1; token < vocab; token += 1) {
      const value = logits[frame * vocab + token];
      if (value > bestValue) {
        bestValue = value;
        best = token;
      }
    }
    ids.push(best);
  }
  return ids;
}

async function main() {
  if (!env.FFMPEG_PATH) {
    throw new Error("FFMPEG_PATH is not set in .env");
  }

  console.log("Converting sample audio to 16 kHz mono WAV…");
  await convertTo16kWav(env.FFMPEG_PATH, sourceAudio, wavPath);

  const { samples, sampleRate } = decodeWav(await readFile(wavPath));
  console.log(`Audio: ${(samples.length / sampleRate).toFixed(2)}s @ ${sampleRate} Hz`);

  console.log(`Loading ${path.basename(modelPath)}…`);
  const session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ["cpu"],
    intraOpNumThreads: 4,
    interOpNumThreads: 1,
  });
  console.log(`  inputs:  ${session.inputNames.join(", ")}`);
  console.log(`  outputs: ${session.outputNames.join(", ")}`);

  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];
  const tensor = new ort.Tensor("float32", samples, [1, samples.length]);

  const started = performance.now();
  const results = await session.run({ [inputName]: tensor });
  const elapsed = performance.now() - started;

  const output = results[outputName];
  const dims = output.dims;
  console.log(
    `Inference: ${elapsed.toFixed(0)} ms — output dims [${dims.join(", ")}], type ${output.type}`,
  );

  const vocab = JSON.parse(await readFile(vocabPath, "utf8")) as Record<string, number>;
  const idToToken = new Map<number, string>(
    Object.entries(vocab).map(([token, id]) => [id, token]),
  );

  let frameIds: number[];
  if (dims.length === 3) {
    const [, frames, vocabSize] = dims as [number, number, number];
    frameIds = argmaxFrames(output.data as Float32Array, frames, vocabSize);
  } else if (dims.length === 2) {
    frameIds = Array.from(output.data as Float32Array | BigInt64Array, Number);
  } else {
    throw new Error(`Unexpected output rank ${dims.length}`);
  }

  const transcript = greedyCtcDecode(frameIds, idToToken);
  console.log(`\nTranscript (${frameIds.length} frames):\n  ${transcript || "(empty)"}\n`);

  await writeFile(
    path.join(modelsDir, "samples", "example.transcript.txt"),
    transcript + "\n",
    "utf8",
  );
}

main().catch((error) => {
  console.error("\nSTT spike failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
