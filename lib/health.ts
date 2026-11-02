import { access } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export type CheckState = "ok" | "down" | "missing" | "unknown";

export type HealthReport = {
  status: "ok" | "degraded" | "down";
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  checks: {
    database: { state: CheckState; detail: string };
    pgvector: { state: CheckState; detail: string };
    ollama: { state: CheckState; detail: string };
    ffmpeg: { state: CheckState; detail: string };
    models: Array<{
      id: string;
      name: string;
      state: CheckState;
      path: string;
    }>;
  };
};

const MODEL_FILES = [
  {
    id: "stt",
    name: "freococo-myanmar-asr",
    file: path.join("freococo", "freococo.onnx"),
  },
  {
    id: "tts",
    name: "mms-tts-mya",
    file: path.join("mms-tts-mya", "onnx", "model.onnx"),
  },
] as const;

async function fileExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function checkDatabase(): Promise<{ state: CheckState; detail: string }> {
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    return { state: "ok", detail: "connected" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.trim().split("\n")[0] || error.name
        : "unreachable";
    return { state: "down", detail: message };
  }
}

async function checkPgvector(): Promise<{ state: CheckState; detail: string }> {
  try {
    const rows = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    return rows.length > 0
      ? { state: "ok", detail: "vector extension installed" }
      : { state: "missing", detail: "run scripts/db-init.sql as a superuser" };
  } catch {
    return { state: "unknown", detail: "database unavailable" };
  }
}

async function checkOllama(): Promise<{ state: CheckState; detail: string }> {
  try {
    const response = await fetch(new URL("/api/tags", env.OLLAMA_BASE_URL), {
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!response.ok) {
      return { state: "down", detail: `HTTP ${response.status}` };
    }
    const body = (await response.json()) as { models?: Array<{ name: string }> };
    const installed = body.models?.some((model) =>
      model.name.startsWith(env.OLLAMA_MODEL.split(":")[0]),
    );
    return installed
      ? { state: "ok", detail: `${env.OLLAMA_MODEL} installed` }
      : { state: "missing", detail: `pull ${env.OLLAMA_MODEL}` };
  } catch {
    return { state: "down", detail: "not running on " + env.OLLAMA_BASE_URL };
  }
}

async function checkFfmpeg(): Promise<{ state: CheckState; detail: string }> {
  if (!env.FFMPEG_PATH) {
    return { state: "missing", detail: "FFMPEG_PATH is not set" };
  }
  const found = await fileExists(env.FFMPEG_PATH);
  return found
    ? { state: "ok", detail: env.FFMPEG_PATH }
    : { state: "missing", detail: `not found: ${env.FFMPEG_PATH}` };
}

export async function getHealth(): Promise<HealthReport> {
  const modelsRoot = path.resolve(process.cwd(), env.MODELS_DIR);

  const [database, pgvector, ollama, ffmpeg, modelStates] = await Promise.all([
    checkDatabase(),
    checkPgvector(),
    checkOllama(),
    checkFfmpeg(),
    Promise.all(
      MODEL_FILES.map(async (model) => {
        const absolute = path.join(modelsRoot, model.file);
        return {
          id: model.id,
          name: model.name,
          path: absolute,
          state: (await fileExists(absolute)) ? ("ok" as const) : ("missing" as const),
        };
      }),
    ),
  ]);

  return {
    status: database.state === "ok" ? "ok" : "down",
    service: "Burmese Product Advisor",
    version: "0.2.0-phase1",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
    checks: { database, pgvector, ollama, ffmpeg, models: modelStates },
  };
}
