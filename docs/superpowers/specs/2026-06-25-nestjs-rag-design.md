# NestJS RAG System — Design Spec

**Date:** 2026-06-25  
**Status:** Approved  
**Author:** Muhammad-Tayyab1

---

## 1. Overview

A full-stack Retrieval-Augmented Generation (RAG) system built with NestJS (backend) and Next.js (frontend). Users upload documents and ask natural language questions — the system retrieves the most relevant chunks and uses an LLM to generate a grounded answer with source citations.

**Goal:** A portfolio-quality, production-ready GitHub project demonstrating the complete RAG pipeline using 100% free cloud services.

---

## 2. Use Case

- User uploads a document (PDF, TXT, MD, DOCX)
- System parses, chunks, embeds, and stores vectors in Pinecone
- User asks a question in the chat UI
- System embeds the query, retrieves top-5 similar chunks from Pinecone
- Chunks + question sent to Groq LLM → answer returned with sources

---

## 3. Architecture

### Monorepo Structure

```
nestjs-rag/
├── apps/
│   ├── backend/                    # NestJS API (port 3001)
│   │   ├── src/
│   │   │   ├── ingestion/          # Document upload & processing
│   │   │   │   ├── ingestion.module.ts
│   │   │   │   ├── ingestion.controller.ts
│   │   │   │   ├── ingestion.service.ts
│   │   │   │   └── parsers/
│   │   │   │       ├── pdf.parser.ts
│   │   │   │       ├── txt.parser.ts
│   │   │   │       ├── md.parser.ts
│   │   │   │       └── docx.parser.ts
│   │   │   ├── embedding/          # Text → vectors via HuggingFace
│   │   │   │   ├── embedding.module.ts
│   │   │   │   └── embedding.service.ts
│   │   │   ├── vector-store/       # Pinecone operations
│   │   │   │   ├── vector-store.module.ts
│   │   │   │   └── vector-store.service.ts
│   │   │   ├── retrieval/          # Semantic search
│   │   │   │   ├── retrieval.module.ts
│   │   │   │   └── retrieval.service.ts
│   │   │   ├── chat/               # Query → LLM → answer
│   │   │   │   ├── chat.module.ts
│   │   │   │   ├── chat.controller.ts
│   │   │   │   └── chat.service.ts
│   │   │   ├── common/
│   │   │   │   ├── dto/
│   │   │   │   ├── filters/        # Global exception filter
│   │   │   │   └── interceptors/
│   │   │   └── app.module.ts
│   │   ├── test/
│   │   ├── .env.example
│   │   └── package.json
│   └── frontend/                   # Next.js 14 (port 3000)
│       ├── app/
│       │   ├── page.tsx            # Main chat + upload UI
│       │   └── layout.tsx
│       ├── components/
│       │   ├── ChatWindow.tsx
│       │   ├── MessageBubble.tsx
│       │   └── DocumentUpload.tsx
│       ├── lib/
│       │   └── api.ts              # Axios API client
│       └── package.json
├── package.json                    # npm workspaces root
├── .gitignore
└── README.md
```

---

## 4. Technology Stack

| Layer | Technology | Why Free |
|---|---|---|
| Backend framework | NestJS | Open source |
| Frontend framework | Next.js 14 (App Router) | Open source |
| Styling | Tailwind CSS | Open source |
| LLM | Groq API — `llama-3.3-70b-versatile` | Generous free tier |
| Embeddings | HuggingFace Inference API — `sentence-transformers/all-MiniLM-L6-v2` | Free tier |
| Vector database | Pinecone (serverless free tier) | 2GB free, no expiry |
| Document parsing | pdf-parse, mammoth, fs | Open source |
| HTTP client | Axios | Open source |

---

## 5. Data Flow

### Ingestion Pipeline
```
Upload (multipart) → File type detection → Parser (pdf/txt/md/docx)
→ Text extracted → Chunker (500 tokens, 50 overlap)
→ Each chunk → HuggingFace embed API → float[] vector
→ Vector + chunk text + metadata → Pinecone upsert
```

### Query Pipeline
```
User question → HuggingFace embed → Pinecone similarity search (top-5)
→ Retrieved chunks + original question → Groq prompt
→ LLM answer → Response with sources
```

---

## 6. API Endpoints

### Ingestion
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ingestion/upload` | Upload document (multipart/form-data) |
| `GET` | `/api/ingestion/documents` | List all ingested documents |
| `DELETE` | `/api/ingestion/:id` | Remove document and its vectors |

### Chat
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat/query` | Ask a question, get RAG answer |

### Health
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |

### Request/Response Examples

**Upload:**
```
POST /api/ingestion/upload
Content-Type: multipart/form-data
Body: file=<document>

Response 201:
{ "message": "Document ingested successfully", "documentId": "uuid", "chunks": 24 }
```

**Query:**
```
POST /api/chat/query
{ "question": "What is the refund policy?" }

Response 200:
{
  "answer": "The refund policy allows returns within 30 days...",
  "sources": [
    { "filename": "policy.pdf", "chunk": "...relevant excerpt...", "score": 0.92 }
  ]
}
```

---

## 7. Frontend UI

Single-page Next.js app with two sections:

```
┌─────────────────────────────────────────┐
│  NestJS RAG                             │
├─────────────────────────────────────────┤
│  📄 Upload Document                     │
│  [Choose File — PDF/TXT/MD/DOCX]        │
│  [Upload]                               │
├─────────────────────────────────────────┤
│  💬 Chat                                │
│  ┌───────────────────────────────────┐  │
│  │ You: What is the refund policy?   │  │
│  │ AI:  Returns are allowed within.. │  │
│  │ Sources: policy.pdf (score: 0.92) │  │
│  └───────────────────────────────────┘  │
│  [Type your question...]       [Send]   │
└─────────────────────────────────────────┘
```

Components:
- `DocumentUpload.tsx` — file picker, upload progress, success/error states
- `ChatWindow.tsx` — message history, scroll to bottom
- `MessageBubble.tsx` — user vs AI message styling, source citations

---

## 8. Error Handling

| Scenario | HTTP Status | Message |
|---|---|---|
| Invalid file type | 400 | "Unsupported file type. Use PDF, TXT, MD, or DOCX" |
| File too large (>10MB) | 413 | "File exceeds 10MB limit" |
| No documents uploaded | 400 | "No documents in knowledge base. Upload a document first." |
| Empty question | 400 | "Question cannot be empty" |
| Pinecone API failure | 502 | "Vector store unavailable. Please try again." |
| Groq API failure | 502 | "LLM service unavailable. Please try again." |
| HuggingFace API failure | 502 | "Embedding service unavailable. Please try again." |

A global NestJS exception filter catches all unhandled errors and returns a consistent error envelope:
```json
{ "statusCode": 500, "message": "Internal server error", "timestamp": "..." }
```

---

## 9. Environment Variables

```env
# Backend — apps/backend/.env
GROQ_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=nestjs-rag
HUGGINGFACE_API_KEY=
PORT=3001

# Frontend — apps/frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 10. Chunking Strategy

- **Chunk size:** 500 tokens
- **Overlap:** 50 tokens (preserves context across chunk boundaries)
- **Metadata per chunk:** `filename`, `documentId`, `chunkIndex`, `uploadedAt`
- **Embedding model:** `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)
- **Pinecone index:** cosine similarity, 384 dimensions

---

## 11. Testing Strategy

### Backend (Jest)
- Unit tests for each service with mocked external APIs (Pinecone, Groq, HuggingFace)
- E2E test for full upload → query pipeline using NestJS testing utilities
- Each parser tested independently with sample files

### Frontend (Jest + React Testing Library)
- Unit tests for `ChatWindow`, `MessageBubble`, `DocumentUpload` components
- API client tested with mocked responses

---

## 12. Deployment (Free Tier)

| Service | Platform | Free Plan |
|---|---|---|
| Backend (NestJS) | Railway or Render | Free tier available |
| Frontend (Next.js) | Vercel | Hobby plan (free) |
| Vector DB | Pinecone | Serverless free tier |
| LLM | Groq | Free tier |
| Embeddings | HuggingFace | Free inference API |

---

## 13. Constraints & Decisions

- **No authentication** — kept simple for a portfolio demo
- **Single shared collection** — all documents go into one Pinecone namespace
- **File size limit** — 10MB max per upload
- **Top-K** — 5 chunks retrieved per query
- **No streaming** — LLM response returned as a single block (streaming adds complexity)
