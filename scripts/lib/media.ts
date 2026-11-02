import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function sha256(file: string): Promise<string> {
  const buffer = await readFile(file);
  return createHash("sha256").update(buffer).digest("hex");
}

export async function downloadFile(
  url: string,
  destination: string,
  expectedSha256?: string,
): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true });

  if (await exists(destination)) {
    if (!expectedSha256 || (await sha256(destination)) === expectedSha256) {
      console.log(`  ✓ cached  ${path.basename(destination)}`);
      return;
    }
    console.log(`  ! checksum mismatch, re-downloading ${path.basename(destination)}`);
  }

  console.log(`  ↓ ${url}`);
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }

  const total = Number(response.headers.get("content-length") ?? 0);
  const chunks: Uint8Array[] = [];
  let received = 0;
  let lastReport = 0;

  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
    received += chunk.length;
    if (total > 0 && Date.now() - lastReport > 1500) {
      lastReport = Date.now();
      const pct = ((received / total) * 100).toFixed(1);
      process.stdout.write(`\r    ${pct}% (${(received / 1e6).toFixed(1)} MB)`);
    }
  }
  process.stdout.write("\r");

  const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  await writeFile(destination, buffer);

  if (expectedSha256) {
    const actual = createHash("sha256").update(buffer).digest("hex");
    if (actual !== expectedSha256) {
      throw new Error(
        `Checksum mismatch for ${destination}\n  expected ${expectedSha256}\n  actual   ${actual}`,
      );
    }
  }

  console.log(`  ✓ saved   ${path.basename(destination)} (${(buffer.length / 1e6).toFixed(1)} MB)`);
}

/** Reads a 16-bit PCM mono WAV file into normalized float32 samples. */
export function decodeWav(buffer: Buffer): { samples: Float32Array; sampleRate: number } {
  if (buffer.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error("Not a WAV file");
  }

  let offset = 12;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let channels = 0;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;

    if (id === "fmt ") {
      channels = buffer.readUInt16LE(body + 2);
      sampleRate = buffer.readUInt32LE(body + 4);
      bitsPerSample = buffer.readUInt16LE(body + 14);
    } else if (id === "data") {
      if (channels !== 1 || bitsPerSample !== 16) {
        throw new Error(`Expected mono 16-bit PCM, got ${channels}ch/${bitsPerSample}bit`);
      }
      const length = Math.min(size, buffer.length - body);
      const samples = new Float32Array(Math.floor(length / 2));
      for (let i = 0; i < samples.length; i += 1) {
        samples[i] = buffer.readInt16LE(body + i * 2) / 32768;
      }
      return { samples, sampleRate };
    }

    offset = body + size + (size % 2);
  }

  throw new Error("WAV data chunk not found");
}

/** Builds a 16-bit PCM mono WAV file from float32 samples. */
export function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(samples.length * 2, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  return buffer;
}

export async function convertTo16kWav(
  ffmpegPath: string,
  input: string,
  output: string,
): Promise<void> {
  await mkdir(path.dirname(output), { recursive: true });
  await execFileAsync(ffmpegPath, [
    "-y",
    "-i",
    input,
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    output,
  ]);
}
