# NestJS RAG — Claude Code Guide

## Project Overview

Full-stack RAG (Retrieval-Augmented Generation) system. NestJS backend + Next.js 14 frontend. Users upload documents and ask questions answered by Groq LLM grounded in the document content.

## Stack

- **Backend:** NestJS on port 3001
- **Frontend:** Next.js 14 (App Router) on port 3000
- **LLM:** Groq — `llama-3.3-70b-versatile`
- **Embeddings:** HuggingFace — `sentence-transformers/all-MiniLM-L6-v2` (384 dims)
- **Vector DB:** Pinecone (serverless, cosine similarity)

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

cd apps/backend && npx jest              # Run all backend tests (18 tests)
cd apps/backend && npx jest --no-coverage <file>  # Run one test file
cd apps/backend && npx tsc --noEmit     # Type-check backend
cd apps/frontend && npx tsc --noEmit    # Type-check frontend
```

## Architecture

```
apps/
├── backend/src/
│   ├── embedding/          # HuggingFace embed() + embedBatch()
│   ├── vector-store/       # Pinecone upsert/search/delete + in-memory registry
│   ├── ingestion/          # Parse → chunk → embed → store pipeline
│   │   └── parsers/        # pdf.parser, txt.parser, md.parser, docx.parser
│   ├── retrieval/          # embed question → similaritySearch (topK=5)
│   ├── chat/               # retrieve chunks → Groq prompt → answer + sources
│   └── common/
│       ├── dto/            # QueryDto, UploadResponseDto, ChatResponseDto, SourceDto
│       └── filters/        # HttpExceptionFilter (global error envelope)
└── frontend/
    ├── app/page.tsx         # Main page — upload + chat
    ├── components/
    │   ├── DocumentUpload   # File picker, 10MB check, upload progress
    │   ├── ChatWindow       # Message list, scroll, Enter-to-send
    │   └── MessageBubble    # User/AI bubbles + source citations
    └── lib/api.ts           # Typed Axios client (uploadDocument, chat, list, delete)
```

## Key Decisions

- **Chunk size:** 2000 chars, 200 overlap
- **Top-K:** 5 chunks per query
- **File size limit:** 10MB
- **Document registry:** In-memory Map — resets on server restart (intentional, no DB)
- **Vector IDs:** `${documentId}-${chunkIndex}` format
- **Pinecone delete:** Filter-based (`documentId` metadata filter), not ID reconstruction
- **No auth:** Open API — portfolio demo only
- **No streaming:** LLM response returned as single block

## API Endpoints

```
POST   /api/ingestion/upload     multipart file upload
GET    /api/ingestion/documents  list all documents
DELETE /api/ingestion/:id        delete document + vectors
POST   /api/chat/query           { question } → { answer, sources[] }
GET    /api/health               { status: 'ok', timestamp }
```

## Error Responses

All errors return: `{ statusCode, message, timestamp }` via global `HttpExceptionFilter`.

| Scenario              | Code |
| --------------------- | ---- |
| Unsupported file type | 400  |
| Empty question        | 400  |
| File > 10MB           | 413  |
| HuggingFace down      | 502  |
| Pinecone down         | 502  |
| Groq down             | 502  |

## Testing

Each service has a `.spec.ts` alongside it. All external APIs (HuggingFace, Pinecone, Groq) are mocked — no real keys needed to run tests.

```bash
cd apps/backend && npx jest --no-coverage
# Expected: 6 suites, 18 tests, all pass
```

## Lessons Learned

- HuggingFace free inference API cold-starts after inactivity (10–20s first request)
- Pinecone serverless supports filter-based delete: `deleteMany({ filter: { documentId: { '$eq': id } } })`
- NestJS `ValidationPipe` requires `transform: true` for `@IsString()` to reject non-string inputs
- `emitDecoratorMetadata: true` is required in tsconfig for NestJS DI to work
