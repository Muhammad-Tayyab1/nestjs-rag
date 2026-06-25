# NestJS RAG — Document Q&A with Retrieval-Augmented Generation

A full-stack RAG system built with NestJS and Next.js. Upload any document and ask questions — the LLM answers using only your document's content, with source citations.

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (Node.js) |
| Frontend | Next.js 14 + Tailwind CSS |
| LLM | Groq — `llama-3.3-70b-versatile` |
| Embeddings | HuggingFace — `all-MiniLM-L6-v2` |
| Vector DB | Pinecone (serverless) |

## Free Credentials Required

| Service | Sign-up URL |
|---|---|
| Groq API | https://console.groq.com |
| Pinecone | https://app.pinecone.io |
| HuggingFace | https://huggingface.co/settings/tokens |

In Pinecone, create an index named `nestjs-rag` with **384 dimensions** and **cosine** metric.

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/Muhammad-Tayyab1/nestjs-rag.git
cd nestjs-rag
npm install
```

### 2. Configure environment

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local
```

Fill in your API keys in `apps/backend/.env`.

### 3. Run backend

```bash
npm run dev:backend
# → http://localhost:3001
```

### 4. Run frontend

```bash
npm run dev:frontend
# → http://localhost:3000
```

## How It Works

```
Upload document
  → Parse (PDF/TXT/MD/DOCX)
  → Split into chunks (2000 chars, 200 overlap)
  → Embed each chunk via HuggingFace
  → Store vectors in Pinecone

Ask a question
  → Embed question via HuggingFace
  → Retrieve top-5 similar chunks from Pinecone
  → Send chunks + question to Groq LLM
  → Return answer with source citations
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/ingestion/upload` | Upload document (multipart) |
| GET | `/api/ingestion/documents` | List ingested documents |
| DELETE | `/api/ingestion/:id` | Remove document |
| POST | `/api/chat/query` | Ask a question |

## Production Note

⚠️ **CORS is currently set to `*`** for development convenience. Before deploying to production, restrict CORS to your frontend domain in `apps/backend/src/main.ts`.
