/**
 * Downloads the Phase 1 local models into storage/models.
 * No Python, no cloud inference — files land on disk and stay there.
 *
 *   pnpm models:fetch
 */
import "dotenv/config";
import path from "node:path";
import { env } from "../lib/env";
import { downloadFile } from "./lib/media";

const STT_REPO = "https://huggingface.co/thura2/freococo-myanmar-asr-onnx/resolve/main";
const STT_SAMPLE = "https://huggingface.co/freococo/myanmar_asr/resolve/main/example.mp3";
const TTS_REPO = "https://huggingface.co/233contentisContent/mms-tts-mya-onnx/resolve/main";

const modelsDir = path.resolve(process.cwd(), env.MODELS_DIR);

const sttFiles = [
  {
    file: "freococo.onnx",
    url: `${STT_REPO}/freococo.onnx`,
    sha256: "07f445eb6fd7b558e3d59accd8bdbd579f4af13ef15cd2efb8d271eca0209a3c",
  },
  {
    file: "vocab.json",
    url: `${STT_REPO}/vocab.json`,
    sha256: "5154e188dec1e665f0d6411f003ba91bbdf62757f45c5188f39d018e058a4e8e",
  },
];

const ttsFiles = [
  "config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "added_tokens.json",
  "vocab.json",
  "onnx/model.onnx",
];

async function main() {
  console.log(`\nModels directory: ${modelsDir}\n`);

  console.log("Burmese STT — freococo/myanmar_asr (ONNX)");
  for (const entry of sttFiles) {
    await downloadFile(
      entry.url,
      path.join(modelsDir, "freococo", entry.file),
      entry.sha256,
    );
  }

  console.log("\nBurmese TTS — facebook/mms-tts-mya (ONNX export)");
  for (const file of ttsFiles) {
    await downloadFile(
      `${TTS_REPO}/${file}`,
      path.join(modelsDir, "mms-tts-mya", file),
    );
  }

  console.log("\nBurmese speech sample (for the STT spike)");
  await downloadFile(STT_SAMPLE, path.join(modelsDir, "samples", "example.mp3"));

  console.log("\nDone. Next:");
  console.log("  pnpm spike:stt");
  console.log("  pnpm spike:tts\n");
}

main().catch((error) => {
  console.error("\nModel download failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
