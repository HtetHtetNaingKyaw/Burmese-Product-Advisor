# Phase 1 — Architecture & Environment Report

**Status:** approved and implemented (Phase 1). AI runtime findings verified by execution — see §10.
**Date:** 2026-11-01 (revised 2026-11-02)
**Decision:** 100% JavaScript/TypeScript. Next.js is both frontend and backend. No Python at
runtime, no Python application code, no cloud AI APIs.

---

## 1. Environment audit (measured, not assumed)

| Item | Value | Notes |
|---|---|---|
| OS | Windows 11 | |
| CPU | 12th Gen Intel Core i5-1245U | 10 cores / 12 threads |
| RAM | 15.6 GB usable | ~16 GB |
| GPU | Intel Iris Xe (integrated) | **No CUDA** → all inference is CPU |
| Disk free (C:) | 98.2 GB | enough for models + DB |
| Node.js | v24.21.0 | matches your spec |
| pnpm | 12.11.2 | matches your spec |
| npm | 11.19.0 | |
| Git | 2.56.0 | |
| ffmpeg | 9.0.2 (`C:\Users\hp\Downloads\ffmpeg-...\bin\ffmpeg.exe`) | **not on PATH** — must be configured via env var |
| PostgreSQL | **not installed** | no service, no `psql`, nothing on :5432 |
| Ollama | **not installed** | nothing on :11434 |
| Docker | **not installed** | not required by this plan |

### Existing repo state (important)

The repo is **not empty** and currently contradicts the new decision:

```
burmese-product-advisor/
├── ai-service/        # FastAPI + Pydantic Settings  ← Python, must go
├── .venv/             # Python 3.14 virtualenv        ← must go
├── client/            # empty
├── server/            # empty
├── storage/           # empty (keep → becomes model/upload storage)
├── frontend/          # Next.js 16.4.3, React 19.3.0, Tailwind v4, TS 5
├── README.md          # documents the FastAPI setup
└── .gitignore         # contains Python rules
```

No commits exist yet (`git log` fails), so nothing is in history — but **nothing has been
deleted by me**. Removal is proposed in §7 and needs your explicit approval.

---

## 2. The critical question: what actually runs in Node.js?

I verified this against the Hugging Face file trees, the npm registry, the Piper voice list,
and the sherpa-onnx model index. Names and pipeline tags were **not** trusted — file lists were
inspected directly.

### 2.1 Speech-to-text (Burmese)

| Candidate | What actually ships | Node.js verdict |
|---|---|---|
| **`thura2/freococo-myanmar-asr-onnx`** (export of `freococo/myanmar_asr`) | **1× 78 MB ONNX graph** + `vocab.json`. 23.8M params, 12-layer Conformer CTC, 2,566-syllable vocab. Log-mel frontend is **inside the graph**. Input: 16 kHz mono float32 `[1, samples]`. Output: per-frame syllable IDs, greedy CTC decode. | ✅ **Adopt.** Plain ONNX graph → runs on `onnxruntime-node` (Windows x64 prebuilt). Needs ~60 lines of TS for CTC decode. Reported SER **9.42%** held-out, **12.30%** independent crawl. Exported for an Android app running ONNX Runtime on-device. |
| `onnx-community/whisper-base` / `whisper-small` / `whisper-large-v3-turbo` | Real ONNX (encoder/decoder + int8/q4 variants), `transformers.js` library | ✅ Runs in `@huggingface/transformers`. Burmese (`my`) is a supported Whisper language, but these are **not** Burmese fine-tunes → noticeably worse Burmese accuracy. Keep as **fallback / second opinion**, not primary. |
| `chuuhtetnaing/whisper-small-myanmar`, `whisper-medium-myanmar`, `whisper-large-v3-myanmar` | `model.safetensors` only (922 MB / 5.9 GB), **no ONNX** | ❌ Not runnable in Node as-is. Would need a Python/`optimum` export step. Excluded. |
| `Riku47/*-burmese`, `thantzinphyo/Dolphin-*-Burmese-ASR`, `YonaKhine/w2v2-bert-burmese-asr`, `axtr05/burmese-asr-small` | PyTorch `.pt` / safetensors only | ❌ Python-only inference. Excluded. |
| `sherpa-onnx-node` | Package exists (v2.0.1, prebuilt, no deps) | ❌ Its official ASR/TTS model index contains **zero** Burmese models. Rejected for STT/TTS. |
| `nodejs-whisper` / `smart-whisper` | whisper.cpp wrappers | ⚠️ Works, but requires a native C++ build toolchain and offers no Burmese advantage over the 78 MB model. Not needed. |

**Conclusion:** Burmese STT is viable **without Python** thanks to `freococo-myanmar-asr-onnx`.
This is the single most important finding — a 78 MB CPU model that beats a Whisper-small
fine-tune in size and is purpose-trained on 1.66M Burmese utterances.

### 2.2 Text-to-speech (Burmese)

| Candidate | What actually ships | Node.js verdict |
|---|---|---|
| **`facebook/mms-tts-mya`** (Meta MMS, VITS) + community ONNX `233contentisContent/mms-tts-mya-onnx` | `onnx/model.onnx` **109 MB**, `config.json` with `model_type: "vits"`, `VitsTokenizer` config (`language: "mya"`, `add_blank: true`), Burmese `vocab.json` | ✅ **Only viable option.** `@huggingface/transformers` supports VITS + the `text-to-speech` pipeline. Must be smoke-tested (community repo, 0 downloads) — see risk R2. |
| **Piper** | Checked the official `voices.json`: **178 voices, 0 Burmese** (my_MM absent) | ❌ Dead end. |
| `zinooko/VoxCPM2-Burmese-TTS-ONNX` | 262 sharded ONNX files (LLM + audio VAE pipeline) | ❌ Custom multi-stage inference, ~GBs, impractical on this hardware. |
| Coqui XTTS / `vertaxyu/TTS_MMS_Burmese_Kyaw` / `Waiyanmoe/burmese-tts-2026` | Python / PyTorch | ❌ Excluded. |
| `sherpa-onnx-node` TTS | No Burmese voice in official index | ❌ |

**Conclusion:** one acceptable Burmese voice exists. It is single-speaker, read-aloud style,
clearly synthetic. That is the honest ceiling of local Burmese TTS in JS today.

### 2.3 Embeddings, LLM

| Role | Choice | Evidence |
|---|---|---|
| Embeddings | `Xenova/multilingual-e5-small` — 384-dim, ONNX int8 **113 MB** | Real `onnx/model_quantized.onnx`; 495k downloads; multilingual incl. Burmese; runs in `@huggingface/transformers` |
| LLM | Ollama + `qwen3:4b-instruct` (Q4, ~2.5 GB) or `gemma3:4b` | CPU-only on Iris Xe. 4B is the sweet spot for 16 GB; 8B would be ~2–3× slower |
| Vector store | PostgreSQL 17 + `pgvector`, `vector(384)`, HNSW index | matches e5-small dims |

### 2.4 Runtime versions verified on npm

`@huggingface/transformers` **4.3.2** (depends on `onnxruntime-node`), `onnxruntime-node`
**1.31.1** (`os: win32/darwin/linux`), `sherpa-onnx-node` 2.0.1, `better-auth` **1.7.14**,
`@prisma/client` **7.10.1** (Prisma 8 is still RC → pin 7.x), `zod` 4.6.7.

---

## 3. Target architecture

**One Next.js application. One process. One port.** Route Handlers are the backend.

```
Browser ──HTTP──► Next.js (App Router)
                   ├── React Server Components / Client Components
                   ├── Route Handlers  /api/*
                   │     ├── Better Auth
                   │     ├── Products / Conversations
                   │     ├── /api/chat       → Ollama (11434) + pgvector
                   │     ├── /api/speech/stt → onnxruntime-node (freococo)
                   │     └── /api/speech/tts → @huggingface/transformers (MMS VITS)
                   └── Prisma → PostgreSQL 17 + pgvector
```

```
burmese-product-advisor/
├── app/
│   ├── layout.tsx, page.tsx, globals.css
│   ├── (auth)/login, register
│   ├── (app)/chat, products, products/[id]
│   └── api/
│       ├── auth/[...all]/route.ts
│       ├── health/route.ts
│       ├── products/route.ts, products/[id]/route.ts
│       ├── chat/route.ts
│       └── speech/transcribe/route.ts, speech/synthesize/route.ts
├── components/            # UI (shadcn-style primitives kept local)
├── lib/
│   ├── db.ts              # Prisma singleton
│   ├── auth.ts            # Better Auth server instance
│   ├── auth-client.ts
│   ├── env.ts             # zod-validated env
│   ├── ai/
│   │   ├── ollama.ts      # streaming chat client (native fetch)
│   │   ├── stt.ts         # ONNX session + CTC greedy decoder
│   │   ├── tts.ts         # VITS pipeline wrapper, output WAV
│   │   └── embed.ts       # e5-small feature extraction
│   ├── audio/wav.ts       # WAV encode/decode, 16 kHz mono, ffmpeg fallback
│   └── rag/search.ts      # pgvector cosine search
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/               # TypeScript utilities (tsx), never Python
│   ├── fetch-models.ts    # download + SHA-256 verify into storage/models
│   ├── spike-stt.ts       # Phase 1 compatibility proof
│   ├── spike-tts.ts
│   └── db-init.sql        # CREATE EXTENSION vector; (optional) role setup
├── storage/
│   ├── models/            # git-ignored weights
│   └── uploads/           # git-ignored product images
├── docs/architecture/phase-1.md
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

**Key technical constraints baked into the design**

- Every AI route uses `export const runtime = "nodejs"` — ONNX and native modules cannot run on Edge.
- `next.config.ts` → `serverExternalPackages: ["onnxruntime-node", "@huggingface/transformers"]`.
- Model weights are **not** bundled; `scripts/fetch-models.ts` downloads them into
  `storage/models/` on first run and verifies the published SHA-256 for `freococo.onnx`.
- Model sessions are **module-level singletons** (loaded once, reused across requests) to avoid
  re-loading 78–113 MB per request.
- Audio pipeline: browser records `audio/webm` → `ffmpeg` (configured via `FFMPEG_PATH`) converts
  to 16 kHz mono WAV → float32 → ONNX.
- Prisma + pgvector: `Unsupported("vector(384)")` column, raw SQL for insert/search, HNSW index
  (`vector_cosine_ops`). No Python, no separate vector DB.

---

## 4. Data model (draft, Phase 2 will finalize)

```
User, Session, Account, Verification   ← Better Auth (Prisma adapter)

Product
  id, nameEn, nameMy, brand, category, priceMMK, descriptionEn, descriptionMy,
  attributes Json, imageUrl, inStock, createdAt, updatedAt

ProductEmbedding
  id, productId (unique), content text, embedding vector(384)

Conversation
  id, userId, title, createdAt, updatedAt

Message
  id, conversationId, role, content, citations Json, audioUrl?, createdAt
```

---

## 5. Phase plan

| Phase | Scope | Exit criteria |
|---|---|---|
| **1 — Foundation** | Next.js at repo root, Tailwind, TS strict, env validation, PostgreSQL 17 + pgvector, Prisma migrations, Better Auth (email/password), protected app shell, `/api/health`, **model compatibility spike (STT + TTS)** | `pnpm dev` runs one process; login works; `/api/health` reports db ok; `scripts/spike-stt.ts` transcribes a Burmese clip; `scripts/spike-tts.ts` writes a playable WAV |
| **2 — Catalog** | Product CRUD, admin UI, image upload to `storage/uploads`, seed import | Create/edit/browse products in Burmese + English |
| **3 — Search & chat** | Embedding pipeline, pgvector similarity, Ollama streaming RAG chat with citations | "Ask about a product" returns a grounded answer from local DB + local LLM |
| **4 — Voice loop** | STT route, TTS route, mic button, streaming playback | Speak Burmese → text → answer → spoken reply, fully offline |
| **5 — Hardening** | Latency, caching, prompt tuning, Burmese quality evaluation set, error states | Measured latency + accuracy numbers documented |

**Phase 1 is deliberately small.** Its job is to prove the stack runs and the two AI runtimes
work on Windows, before any product feature is written.

### Phase 1 acceptance criteria (concrete)

1. `pnpm dev` → one port `:3000`; no Python process, no second server.
2. `pnpm build` passes; `pnpm lint` passes; `tsc --noEmit` clean.
3. PostgreSQL reachable, `CREATE EXTENSION vector` succeeds, one Prisma migration applied.
4. Register → login → logout → protected page redirects when unauthenticated.
5. `GET /api/health` returns `{ status, db, ollama, models }`.
6. `scripts/spike-stt.ts` loads `freococo.onnx` and returns Burmese text for a 16 kHz clip.
7. `scripts/spike-tts.ts` produces `storage/out.wav` playable in a browser.

---

## 6. Hardware budget (worst case, all loaded)

| Component | RAM |
|---|---|
| Next.js dev server + Node | ~0.6 GB |
| `freococo.onnx` (STT) | ~0.15 GB |
| MMS VITS (TTS) | ~0.25 GB |
| e5-small int8 (embeddings) | ~0.20 GB |
| Ollama qwen3:4b Q4_K_M | ~3.0 GB |
| PostgreSQL | ~0.2 GB |
| **Total** | **~4.4 GB of 15.6 GB** — comfortable |

Disk: models ≈ 78 MB + 109 MB + 113 MB + 2.5 GB ≈ **2.8 GB**. Free space 98.2 GB → fine.

Expected latency (CPU-only, estimates to be measured in Phase 1):

- STT, 5 s clip: ~0.3–0.8 s
- Embedding, 1 chunk: ~10–30 ms
- TTS, one sentence: ~1–3 s
- LLM 4B, 150-token answer: ~15–30 s → **must stream**, keep answers short

---

## 7. Cleanup proposal (needs approval)

Delete:

- `ai-service/` (FastAPI app + `requirements.txt` + `__pycache__`)
- `.venv/` (Python virtualenv)
- `client/`, `server/` (empty leftover directories)
- Python sections of `.gitignore`

Keep and repurpose:

- `storage/` → `storage/models` + `storage/uploads`
- `frontend/` → its `package.json` / Tailwind / TS config are reused, but the app moves to the
  repo **root** (single Next.js app, no monorepo nesting).
- `README.md` → rewritten for the JS-only stack.

Nothing is deleted until you confirm.

---

## 8. Risks and mitigations

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | `freococo.onnx` uses ops not supported by Windows x64 ONNX Runtime | STT unusable | **Highest-priority Phase 1 spike.** Fallback: multilingual `onnx-community/whisper-small` via Transformers.js (worse Burmese accuracy) |
| R2 | `mms-tts-mya-onnx` is an unverified community export (0 downloads) | TTS unusable | Phase 1 spike. Fallbacks: (a) re-export `facebook/mms-tts-mya` ourselves once, (b) ship text-only v1, (c) browser `speechSynthesis` if a Burmese OS voice exists (unlikely) |
| R3 | 4B LLM Burmese fluency is limited | Poor answers | Ground answers in DB facts via RAG, constrain output, keep Burmese product copy pre-written from the catalog |
| R4 | Prisma 8 RC / Next 16 / Better Auth 1.7 integration friction | Setup churn | Pin stable versions: Prisma 7.10.1, Better Auth 1.7.14, Next 16.4.3 |
| R5 | No GPU acceleration | Slow LLM | Streaming, short answers, model kept warm in Ollama, optional 4B→smaller fallback |
| R6 | ffmpeg not on PATH | STT route fails | `FFMPEG_PATH` env var + startup check in `/api/health` |

---

## 9. Decisions needed before implementation

1. **Approve removing the Python scaffold** (§7) and moving the Next.js app to the repo root?
2. **Product data source** for Phase 2: manual admin CRUD, a seed file you provide, or import
   from a spreadsheet/existing dataset? (Do you already have the catalog?)
3. **Auth scope**: single local user, or real multi-user accounts?
4. **Language policy**: Burmese-first UI with English toggle, or English-first?
5. **Voice in Phase 1?** I recommend only the two spike scripts in Phase 1 and full voice UI in
   Phase 4 — confirm or pull voice earlier.

---

## 10. Implementation results (measured on this machine)

### Verified by execution

| Check | Result |
|---|---|
| Next.js build + lint + typecheck | pass (Next 16.4.3, Turbopack) |
| Single-process dev server | pass — `:3000`, proxy + App Router + API routes |
| Burmese auth UI | renders (login/register/dashboard) |
| `freococo-myanmar-asr-onnx` on `onnxruntime-node` | **pass** — 89 ms for 3.13 s audio, 32 ms for 2.53 s |
| CTC decode (int64 ids, blank=0) | pass — outputs Burmese syllables |
| `mms-tts-mya` VITS via Transformers.js | **pass** — 2.53 s of speech, 6.7 s cold load |
| Round trip (TTS → STT) | pass — `မင်္ဂလာပါ။ ဒီထုတ်ကုန်က ကောင်းတယ်။` → `မင်္ဂ လာ ပါ ဒီ ထုတ် ကုန် က ယက် ကောင်း တယ်` |
| `onnxruntime-node` on Windows x64 | pass — prebuilt binary, no build tools |
| Prisma 7 client generation | pass — query compiler + `@prisma/adapter-pg` |
| PostgreSQL 17.11 portable cluster | pass — `initdb` + `pg_ctl`, trust auth, `127.0.0.1:5432` |
| pgvector 0.8.6 | pass — `CREATE EXTENSION vector` → `0.8.6` |
| Prisma migration | pass — `20261102000000_init` applied by `pnpm db:deploy` |
| `GET /api/health` | **pass** — 200; database, pgvector, ffmpeg, STT/TTS models `ok`; ollama `down` (expected until Phase 3) |
| Auth round trip | **pass** — `pnpm smoke:auth`: sign-up → session cookie → `/dashboard` 200 → sign-out; DB ends with 1 user, 1 account, 0 sessions |

### Deviations from the proposal

- **PostgreSQL is portable, not a Windows service.** Binary downloads from the
  EDB mirror were extremely slow on this network, so the cluster is initialised
  under the user profile and managed with `pnpm db:setup|start|stop|status`.
  No admin rights, no service registration.
- **Phase 1 schema contains only Better Auth tables.** Product, embedding and
  conversation tables arrive with their phases, so no unused tables exist now.
- **Embeddings are not downloaded in Phase 1.** `multilingual-e5-small` is
  pulled by Transformers.js in Phase 3, not by `scripts/fetch-models.ts`.
- **`proxy.ts`, not `middleware.ts`.** Next.js 16 renamed the convention.
- **Prisma 7 uses `prisma7.config.ts`** for the datasource URL; the schema
  datasource block has no `url`.
- **`pg_ctl start` runs with ignored stdio.** The postmaster would otherwise keep
  the caller's stdout pipe open, so `pnpm db:setup` would hang after succeeding
  even though the server was already up.
