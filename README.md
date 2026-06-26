# RAG Studio — Document Intelligence

A full-stack RAG (Retrieval-Augmented Generation) system. Upload any document and ask questions — the AI answers using only your document's content, with source citations.

**Live demo:** frontend on Vercel · backend on Render

---

## Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Backend    | NestJS 10 (Node.js), port 3001                          |
| Frontend   | Next.js 14 (App Router) + Tailwind CSS, port 3000       |
| LLM        | Groq — `llama-3.3-70b-versatile`                        |
| Embeddings | HuggingFace — `sentence-transformers/all-MiniLM-L6-v2`  |
| Vector DB  | Pinecone (serverless, cosine, 384 dims)                 |
| API Docs   | Swagger UI at `/api/docs`                               |

---

## How It Works

```
INGESTION
  Upload file (PDF / TXT / MD / DOCX)
    → Parse text
    → Split into 2000-char chunks (200-char overlap)
    → Embed each chunk via HuggingFace (384-dim vectors)
    → Store vectors + metadata in Pinecone

QUERY
  User asks a question
    → Embed the question via HuggingFace
    → Retrieve top-5 most similar chunks from Pinecone
    → Send chunks + question to Groq (Llama 3.3 70B)
    → Return answer + source citations
```

---

## Project Structure

```
nestjs-rag/
├── apps/
│   ├── backend/                        # NestJS API — port 3001
│   │   └── src/
│   │       ├── main.ts                 # Bootstrap: Swagger, CORS, validation, throttle
│   │       ├── app.module.ts           # Root module — ThrottlerModule (30 req/min)
│   │       ├── app.controller.ts       # GET /api/health
│   │       ├── ingestion/
│   │       │   ├── ingestion.controller.ts   # Upload / list / delete endpoints
│   │       │   ├── ingestion.service.ts      # Parse → chunk → embed → store pipeline
│   │       │   └── parsers/                  # pdf · txt · md · docx parsers
│   │       ├── embedding/
│   │       │   └── embedding.service.ts      # HuggingFace embed() + embedBatch()
│   │       ├── vector-store/
│   │       │   └── vector-store.service.ts   # Pinecone upsert / search / delete + in-memory registry
│   │       ├── retrieval/
│   │       │   └── retrieval.service.ts      # similaritySearch (topK=5)
│   │       ├── chat/
│   │       │   └── chat.service.ts           # Retrieve chunks → Groq prompt → answer
│   │       └── common/
│   │           ├── dto/                      # QueryDto · UploadResponseDto · ChatResponseDto
│   │           └── filters/                  # HttpExceptionFilter (global error envelope)
│   └── frontend/                       # Next.js 14 — port 3000
│       ├── app/
│       │   ├── layout.tsx              # Geist font, dark body
│       │   ├── page.tsx                # Sidebar + chat split layout
│       │   ├── globals.css             # Dark theme, custom scrollbar, animations
│       │   └── icon.svg                # Favicon
│       ├── components/
│       │   ├── DocumentUpload.tsx      # Drag-and-drop, progress bar
│       │   ├── DocumentList.tsx        # Doc cards with delete
│       │   ├── ChatWindow.tsx          # Full-height chat, auto-resize input
│       │   └── MessageBubble.tsx       # Gradient user bubble, AI avatar, source cards
│       └── lib/api.ts                  # Typed Axios client
├── package.json                        # npm workspaces root
└── package-lock.json
```

---

## API Endpoints

| Method   | Path                       | Description              |
| -------- | -------------------------- | ------------------------ |
| `GET`    | `/api/health`              | Health check             |
| `POST`   | `/api/ingestion/upload`    | Upload a document        |
| `GET`    | `/api/ingestion/documents` | List ingested documents  |
| `DELETE` | `/api/ingestion/:id`       | Delete document + vectors|
| `POST`   | `/api/chat/query`          | Ask a question           |

Full interactive docs: `GET /api/docs` (Swagger UI)

---

## Security

- **Rate limiting:** 30 requests / minute / IP (global `ThrottlerGuard`)
- **File size:** 10MB enforced server-side in Multer (not just frontend)
- **Input validation:** `ValidationPipe` with `whitelist: true` on all endpoints
- **File type:** Extension whitelist — PDF, TXT, MD, DOCX only
- **Error envelope:** No stack traces exposed — `HttpExceptionFilter` formats all errors

---

## Running Tests

```bash
cd apps/backend && npx jest
# 18 tests, 6 suites — no real API keys needed
```

---

## Deployment

See [SETUP.md](./SETUP.md) for full local setup and deployment instructions (Render + Vercel).

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Upload returns 502 | Check `HUGGINGFACE_API_KEY` and `PINECONE_API_KEY` in `.env` |
| Chat returns 502 | Check `GROQ_API_KEY` in `.env` |
| Frontend can't reach backend | Confirm `NEXT_PUBLIC_API_URL=http://localhost:3001` in `apps/frontend/.env.local` |
| First embed is slow (10–20s) | HuggingFace free tier cold-starts after inactivity — expected |
| Render deploy fails health check | Ensure `app.listen(port, '0.0.0.0')` in `main.ts` |
| Documents lost after redeploy | In-memory registry resets on restart — by design (no database) |
