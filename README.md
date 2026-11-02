# မြန်မာ ထုတ်ကုန် အကြံပေး — Burmese Product Advisor

A local-first, Burmese-language product advisory assistant. One Next.js application
serves both the UI and the API. No Python, no cloud AI APIs.

**Phase 2 status:** auth foundation plus business catalog complete — one business
profile per user, product CRUD, search/filter, and ownership-isolated APIs.
Embeddings, chat and voice arrive in later phases.

---

## Stack

| Layer | Technology |
| --- | --- |
| UI | Next.js 16 (App Router), React 19, TypeScript 5.9, Tailwind CSS v4 |
| Backend | Next.js Route Handlers (Node.js runtime) — no separate server |
| Auth | Better Auth 1.7 (email + password, database sessions) |
| Database | PostgreSQL 17 (portable, no service) + pgvector 0.8.6 |
| ORM | Prisma 7 with the `prisma-client` generator and `@prisma/adapter-pg` |
| LLM | Ollama, `qwen3:4b` (Phase 3) |
| STT | `freococo/myanmar_asr` — 78 MB Conformer-CTC ONNX via `onnxruntime-node` |
| TTS | `facebook/mms-tts-mya` — VITS ONNX via `@huggingface/transformers` |
| Embeddings | `Xenova/multilingual-e5-small` (384-dim, Phase 3) |
| Audio | ffmpeg (16 kHz mono PCM conversion) |

---

## Why these models

Model choice was verified against actual repository file lists, not pipeline tags.

| Candidate | Reality | Verdict |
| --- | --- | --- |
| `thura2/freococo-myanmar-asr-onnx` | Single 78 MB ONNX graph, log-mel inside, raw 16 kHz float input, CTC syllable output. 23.8M params, 9.42% SER. | **Used** |
| Whisper multilingual ONNX (`onnx-community/whisper-*`) | Genuine ONNX, runs in Transformers.js, but no Burmese fine-tune → weaker Burmese accuracy | Fallback |
| `chuuhtetnaing/whisper-*-myanmar`, Dolphin-Burmese, wav2vec2-Burmese | PyTorch safetensors / `.pt` only, **no ONNX** | Rejected |
| `facebook/mms-tts-mya` + ONNX export `233contentisContent/mms-tts-mya-onnx` | VITS, 114 MB ONNX, real `VitsTokenizer` with `language: mya` | **Used** |
| Piper | 178 voices, **zero Burmese** | Rejected |
| `zinooko/VoxCPM2-Burmese-TTS-ONNX` | 262-file sharded LLM+VAE pipeline | Rejected (impractical) |
| sherpa-onnx | No Burmese model in its official index | Rejected |

Measured on this machine (i5-1245U, CPU only):

- STT: **89 ms** for a 3.13 s clip; **32 ms** for a 2.53 s clip.
- TTS: **2.53 s** of Burmese speech generated from text.
- Round trip: TTS output transcribed back to
  `မင်္ဂ လာ ပါ ဒီ ထုတ် ကုန် က ယက် ကောင်း တယ်` from
  `မင်္ဂလာပါ။ ဒီထုတ်ကုန်က ကောင်းတယ်။`

---

## Project layout

```
.
├── app/
│   ├── (auth)/login, register        # Burmese auth screens
│   ├── (app)/dashboard               # protected shell
│   │   ├── page.tsx                  # overview: profile + products + health
│   │   ├── business/page.tsx         # create / view / edit / delete profile
│   │   └── products/                 # list, new, [id], [id]/edit
│   ├── api/
│   │   ├── auth/[...all]/route.ts    # Better Auth handler
│   │   ├── health/route.ts           # system health
│   │   ├── business-profile/route.ts # profile CRUD
│   │   └── products/route.ts, products/[id]/route.ts
│   ├── layout.tsx, page.tsx, globals.css
├── components/                       # forms, nav, filters, confirm, field, empty state
├── lib/
│   ├── auth.ts, auth-client.ts       # Better Auth server/client
│   ├── current-user.ts               # cached session user
│   ├── validation.ts                 # zod schemas shared by API + forms
│   ├── api-response.ts               # JSON errors, Prisma error helpers
│   ├── queries.ts                    # ownership-scoped queries
│   ├── db.ts                         # Prisma + pg adapter singleton
│   ├── env.ts                        # zod-validated environment
│   ├── health.ts                     # DB / pgvector / Ollama / model checks
│   └── generated/prisma/             # generated client (git-ignored)
├── prisma/schema.prisma              # auth + business profile + product models
├── prisma/migrations/                # apply with pnpm db:deploy
├── prisma7.config.ts                 # Prisma 7 config (schema, migrations, URL)
├── scripts/
│   ├── db.ts                         # portable PostgreSQL lifecycle
│   ├── fetch-models.ts               # download + verify local weights
│   ├── spike-stt.ts                  # STT runtime proof
│   ├── spike-tts.ts                  # TTS runtime proof
│   ├── check-health.ts               # print /api/health
│   ├── smoke-auth.ts                 # sign-up → session → sign-out check
│   └── smoke-phase2.ts               # profile/product CRUD + isolation checks
├── storage/
│   ├── models/                       # weights (git-ignored)
│   └── out/                          # generated audio (git-ignored)
└── proxy.ts                          # optimistic auth redirect
```

---

## Setup

### 1. Node dependencies

```bash
pnpm install
```

`pnpm-workspace.yaml` allow-lists the build scripts for Prisma, onnxruntime-node,
esbuild, protobufjs, sharp and unrs-resolver.

### 2. Environment

```bash
copy .env.example .env
```

Generate a secret and put it in `BETTER_AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. PostgreSQL 17 + pgvector (portable, no admin)

The project runs PostgreSQL as a normal user process — no Windows service and no
elevation.

```bash
# one-time: download the EDB binaries zip (~325 MB)
curl -L -o pg.zip https://get.enterprisedb.com/postgresql/postgresql-17.11-1-windows-x64-binaries.zip
tar -xf pg.zip -C C:/Users/hp          # creates C:/Users/hp/pgsql

# one-time: pgvector prebuilt for PG17
curl -L -o vector.zip https://github.com/andreiramani/pgvector_pgsql_windows/releases/download/0.8.6_17/vector.v0.8.6-pg17.zip
unzip vector.zip -d C:/Users/hp/pgvector-0.8.6-pg17

# initialise cluster, copy pgvector, start, create DB
pnpm db:setup
```

Daily use:

```bash
pnpm db:start
pnpm db:stop
pnpm db:status
```

When a script captures the output through a pipe, redirect to a file instead
(`pnpm db:start > db.log 2>&1`): on Windows the postmaster keeps inherited
pipes open, so a pipe would wait for a server that is already up.

Paths are configurable via `PG_HOME`, `PG_DATA`, `PG_PORT`, `PGVECTOR_DIR`.

### 4. Schema

```bash
pnpm db:deploy     # applies prisma/migrations
```

Use `pnpm db:migrate` later when you change `prisma/schema.prisma`.

### 5. Local models (~192 MB)

```bash
pnpm models:fetch
```

Files land in `storage/models/` and are checksum-verified.

---

## Run

```bash
pnpm dev
```

- App: <http://localhost:3000>
- Health: <http://localhost:3000/api/health>

One process, one port. There is no second server.

### Verify

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm check:health

# AI runtime proofs
pnpm spike:stt
pnpm spike:tts                # writes storage/out/mms-tts-sample.wav
pnpm spike:stt storage/out/mms-tts-sample.wav   # round trip

# Auth end to end (with `pnpm dev` running in another terminal)
pnpm smoke:auth

# Phase 2: profiles, products, search, validation, cross-user isolation
pnpm smoke:phase2
```

---

## Business profiles & products

Each signed-in user owns one business profile; a profile owns many products.
All screens are in Burmese and live under the protected `/dashboard` shell.

| Method | Endpoint | Behaviour |
| --- | --- | --- |
| GET | `/api/business-profile` | own profile, `404` if none |
| POST | `/api/business-profile` | create; `409` if one already exists |
| PATCH | `/api/business-profile` | update own profile |
| DELETE | `/api/business-profile` | delete profile and its products (`204`) |
| GET | `/api/products?q=&category=` | own products, case-insensitive search + filter |
| POST | `/api/products` | create under own profile; `409` without a profile |
| GET | `/api/products/:id` | own product, otherwise `404` |
| PATCH | `/api/products/:id` | update own product |
| DELETE | `/api/products/:id` | delete own product (`204`) |

Security model:

- The user id comes only from the Better Auth session (`lib/current-user.ts`).
- Ownership is part of every query (`businessProfile.userId`), never read from
  the request body — extra `userId` / `businessProfileId` fields are ignored.
- Another user's product returns `404` (existence is not leaked).
- Bodies are validated with zod; failures return `400` plus field errors.
- Deleting a profile cascades to its products; deleting a user cascades fully.

Pages: `/dashboard`, `/dashboard/business`, `/dashboard/products`,
`/dashboard/products/new`, `/dashboard/products/[id]`,
`/dashboard/products/[id]/edit`.

---

## Health endpoint

`GET /api/health` returns:

```json
{
  "status": "ok",
  "service": "Burmese Product Advisor",
  "version": "0.2.0-phase1",
  "checks": {
    "database": { "state": "ok" },
    "pgvector": { "state": "ok" },
    "ollama": { "state": "down" },
    "ffmpeg": { "state": "ok" },
    "models": [{ "id": "stt", "state": "ok" }, { "id": "tts", "state": "ok" }]
  }
}
```

`ollama` is expected to be `down` until Phase 3.

---

## Phase plan

| Phase | Scope |
| --- | --- |
| 1 | Foundation, auth, DB, model spikes — **done** |
| 2 | Business profile + product catalog CRUD, search/filter — **done** |
| 3 | Embeddings, pgvector search, Ollama RAG chat |
| 4 | Full voice loop (mic → STT → answer → TTS) |
| 5 | Latency, caching, Burmese quality evaluation |

## Guardrails

- No Python application code, no FastAPI, no Express.
- No cloud AI APIs. Weights and data stay on this machine.
- CPU-only inference (Intel Iris Xe has no CUDA).
- Model weights are not committed; `pnpm models:fetch` restores them.
