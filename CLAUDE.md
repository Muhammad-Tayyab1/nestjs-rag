# NestJS RAG — Claude Code Guide

## Project Overview

Full-stack RAG (Retrieval-Augmented Generation) system. NestJS backend + Next.js 14 frontend. Users upload documents and ask questions answered by Groq LLM grounded in the document content.

## Stack

- **Backend:** NestJS 10 on port 3001
- **Frontend:** Next.js 14 (App Router) on port 3000
- **LLM:** Groq — `llama-3.3-70b-versatile`
- **Embeddings:** HuggingFace — `sentence-transformers/all-MiniLM-L6-v2` (384 dims)
- **Vector DB:** Pinecone (serverless, cosine similarity)
- **API Docs:** Swagger at `/api/docs`

## Required Environment Variables

Backend (`apps/backend/.env`):

```
GROQ_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=nestjs-rag
HUGGINGFACE_API_KEY=
PORT=3001
```

Frontend (`apps/frontend/.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Dev Commands

```bash
npm run dev:backend      # Start NestJS on :3001
npm run dev:frontend     # Start Next.js on :3000

cd apps/backend && npx jest                           # Run all backend tests (18 tests)
cd apps/backend && npx jest --no-coverage <file>      # Run one test file
cd apps/backend && npx tsc --noEmit                   # Type-check backend
cd apps/frontend && npx tsc --noEmit                  # Type-check frontend
```

## Architecture

```
apps/
├── backend/src/
│   ├── main.ts                 # Bootstrap: Swagger, CORS, ValidationPipe, ThrottlerGuard
│   ├── app.module.ts           # Root module — ThrottlerModule (30 req/min global)
│   ├── app.controller.ts       # GET /api/health
│   ├── embedding/              # HuggingFace embed() + embedBatch()
│   ├── vector-store/           # Pinecone upsert/search/delete + in-memory registry
│   ├── ingestion/              # Parse → chunk → embed → store pipeline
│   │   └── parsers/            # pdf · txt · md · docx parsers
│   ├── retrieval/              # embed question → similaritySearch (topK=5)
│   ├── chat/                   # retrieve chunks → Groq prompt → answer + sources
│   └── common/
│       ├── dto/                # QueryDto · UploadResponseDto · ChatResponseDto · SourceDto
│       └── filters/            # HttpExceptionFilter (global error envelope)
└── frontend/
    ├── app/
    │   ├── layout.tsx          # Geist font, dark body
    │   ├── page.tsx            # Sidebar + chat split layout (100vh, no scroll)
    │   ├── globals.css         # Dark theme CSS vars, scrollbar, animations
    │   └── icon.svg            # Favicon — sparkle on purple-blue gradient
    ├── components/
    │   ├── DocumentUpload.tsx  # Drag-and-drop zone, animated progress bar
    │   ├── DocumentList.tsx    # Doc cards with hover-reveal delete button
    │   ├── ChatWindow.tsx      # Full-height chat, suggestion chips, auto-resize textarea
    │   └── MessageBubble.tsx   # Gradient user bubble, AI avatar, compact source cards
    └── lib/api.ts              # Typed Axios client (uploadDocument, chat, list, delete)
```

## Key Decisions

- **Chunk size:** 2000 chars, 200 overlap
- **Top-K:** 5 chunks per query
- **File size limit:** 10MB — enforced server-side in Multer + frontend check
- **Rate limiting:** 30 requests/min/IP via `ThrottlerGuard` (global)
- **Document registry:** In-memory Map — resets on server restart (intentional, no DB)
- **Vector IDs:** `${documentId}-${chunkIndex}` format
- **Pinecone delete:** Filter-based (`documentId` metadata filter)
- **No auth:** Open API — portfolio demo only
- **No streaming:** LLM response returned as single block
- **Swagger:** Auto-generated at `/api/docs` via `@nestjs/swagger`

## API Endpoints

```
GET    /api/health               { status: 'ok', timestamp }
POST   /api/ingestion/upload     multipart file upload → { message, documentId, chunks }
GET    /api/ingestion/documents  list all documents
DELETE /api/ingestion/:id        delete document + vectors
POST   /api/chat/query           { question } → { answer, sources[] }
GET    /api/docs                 Swagger UI
```

## Error Responses

All errors return: `{ statusCode, message, timestamp }` via global `HttpExceptionFilter`.

| Scenario              | Code |
| --------------------- | ---- |
| Unsupported file type | 400  |
| Empty question        | 400  |
| File > 10MB           | 413  |
| Rate limit exceeded   | 429  |
| HuggingFace down      | 502  |
| Pinecone down         | 502  |
| Groq down             | 502  |

## Frontend Theme

Dark AI dashboard aesthetic. Key Tailwind color tokens:
- `bg` — `#0a0a0f` (page background)
- `sidebar` — `#111118`
- `surface` — `#16161f` (cards, bubbles)
- `border` — `#1e1e2e`
- `muted` — `#a1a1aa`
- `accent-purple` — `#7c3aed`
- `accent-blue` — `#2563eb`
- `.accent-gradient` CSS class — `linear-gradient(135deg, #7c3aed, #2563eb)`

## Testing

Each service has a `.spec.ts` alongside it. All external APIs (HuggingFace, Pinecone, Groq) are mocked — no real keys needed to run tests.

```bash
cd apps/backend && npx jest --no-coverage
# Expected: 6 suites, 18 tests, all pass
```

## Deployment

- **Backend → Render:** Root dir `apps/backend`, build `npm install && npm run build`, start `npm run start:prod`
- **Frontend → Vercel:** Root dir `apps/frontend`, framework Next.js (auto-detected)
- Set `NEXT_PUBLIC_API_URL=https://your-render-url.onrender.com` in Vercel env vars

## Lessons Learned

- HuggingFace free inference API cold-starts after inactivity (10–20s first request)
- Pinecone serverless supports filter-based delete: `deleteMany({ filter: { documentId: { '$eq': id } } })`
- NestJS `ValidationPipe` requires `transform: true` for `@IsString()` to reject non-string inputs
- `emitDecoratorMetadata: true` is required in tsconfig for NestJS DI to work
- Render requires `app.listen(port, '0.0.0.0')` — binding to localhost causes health check failures
- `ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }])` — ttl is in milliseconds in v5+
