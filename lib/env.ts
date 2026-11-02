import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  OLLAMA_BASE_URL: z.url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("qwen3:4b"),
  FFMPEG_PATH: z.string().optional(),
  MODELS_DIR: z.string().default("storage/models"),
});

export type Env = z.infer<typeof schema>;

function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${details}\n\nCopy .env.example to .env and fill in the values.`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();
