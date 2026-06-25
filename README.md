# NestJS RAG — Document Q&A with Retrieval-Augmented Generation

A full-stack RAG system built with NestJS and Next.js. Upload any document and ask questions — the LLM answers using only your document's content, with source citations.

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS (Node.js) |
| Frontend | Next.js 14 + Tailwind CSS |
| LLM | Groq — `llama-3.3-70b-versatile` |
| Embeddings | HuggingFace — `sentence-transformers/all-MiniLM-L6-v2` |
| Vector DB | Pinecone (serverless, free tier) |

---

## Step 1 — Get Free API Keys

You need three free accounts. No credit card required for any of them.

### Groq (LLM)

1. Go to [console.groq.com](https://console.groq.com)
2. Click **Sign Up** → create account (Google or email)
3. In the left sidebar click **API Keys**
4. Click **Create API Key**
5. Give it a name (e.g. `nestjs-rag`) → click **Submit**
6. Copy the key — it starts with `gsk_...`
7. Save it — you won't see it again

### Pinecone (Vector Database)

1. Go to [app.pinecone.io](https://app.pinecone.io)
2. Click **Sign Up Free** → create account
3. Once logged in, click **Create Index** in the dashboard
4. Fill in the form:
   - **Index name:** `nestjs-rag`
   - **Dimensions:** `384`
   - **Metric:** `Cosine`
   - **Cloud provider:** Any (AWS us-east-1 is fine)
   - **Plan:** Free (Serverless)
5. Click **Create Index** — wait ~30 seconds for it to be ready
6. In the left sidebar click **API Keys**
7. Copy the **default** API key

### HuggingFace (Embeddings)

1. Go to [huggingface.co](https://huggingface.co)
2. Click **Sign Up** → create a free account
3. Click your avatar (top right) → **Settings**
4. In the left sidebar click **Access Tokens**
5. Click **New token**
6. Name it `nestjs-rag`, Role: **Read**
7. Click **Create token** → copy it (starts with `hf_...`)

---

## Step 2 — Clone and Install

```bash
git clone https://github.com/Muhammad-Tayyab1/nestjs-rag.git
cd nestjs-rag
npm install
```

This installs dependencies for both backend and frontend via npm workspaces.

---

## Step 3 — Configure Environment Variables

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local
```

Open `apps/backend/.env` and fill in your keys:

```env
GROQ_API_KEY=gsk_your_groq_key_here
PINECONE_API_KEY=your_pinecone_key_here
PINECONE_INDEX_NAME=nestjs-rag
HUGGINGFACE_API_KEY=hf_your_huggingface_key_here
PORT=3001
```

The frontend `.env.local` only needs the backend URL (default is already set):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Step 4 — Run the Backend

Open a terminal:

```bash
npm run dev:backend
```

You should see:

```
Backend running on http://localhost:3001
```

Test it's working:

```bash
curl http://localhost:3001/api/health
# → {"status":"ok","timestamp":"..."}
```

---

## Step 5 — Run the Frontend

Open a **second** terminal:

```bash
npm run dev:frontend
```

You should see:

```
▲ Next.js 14.2.0
- Local: http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Step 6 — Upload a Document and Chat

1. Click **Choose File** and select a PDF, TXT, MD, or DOCX (max 10MB)
2. Click **Upload** — wait a few seconds while it parses, embeds, and stores in Pinecone
3. You'll see a success message: `Ingested "filename" — N chunks stored`
4. Type a question in the chat box and press **Enter** or click **Send**
5. The AI will answer using only the content from your document, with source citations

---

## How It Works

```
INGESTION
  Upload file (PDF/TXT/MD/DOCX)
    → Parse text from file
    → Split into chunks (2000 chars, 50-char overlap)
    → Embed each chunk via HuggingFace API (384-dim vectors)
    → Store vectors + metadata in Pinecone

QUERY
  User asks a question
    → Embed the question via HuggingFace API
    → Search Pinecone for top-5 most similar chunks
    → Send chunks + question to Groq (Llama 3.3 70B)
    → Return answer with source file + excerpt citations
```

---

## API Endpoints

| Method | Path | Description | Body |
|---|---|---|---|
| `POST` | `/api/ingestion/upload` | Upload a document | `multipart/form-data` — field: `file` |
| `GET` | `/api/ingestion/documents` | List all ingested documents | — |
| `DELETE` | `/api/ingestion/:id` | Remove a document | — |
| `POST` | `/api/chat/query` | Ask a question | `{ "question": "..." }` |
| `GET` | `/api/health` | Health check | — |

---

## Running Tests

```bash
cd apps/backend
npx jest
```

18 tests across 6 suites — all should pass without any API keys.

---

## Troubleshooting

**Upload fails with 502**
- Check your `HUGGINGFACE_API_KEY` or `PINECONE_API_KEY` in `.env`
- Verify the Pinecone index `nestjs-rag` exists with 384 dimensions and cosine metric

**Chat returns 502**
- Check your `GROQ_API_KEY` in `.env`
- Make sure the backend is still running (`npm run dev:backend`)

**Frontend can't reach backend**
- Confirm `NEXT_PUBLIC_API_URL=http://localhost:3001` in `apps/frontend/.env.local`
- Confirm the backend is running on port 3001

**"No documents in knowledge base"**
- Upload a document first before asking questions

**HuggingFace embedding is slow**
- The free HuggingFace Inference API cold-starts. First request after inactivity may take 10–20 seconds. Subsequent requests are fast.

---

## Project Structure

```
nestjs-rag/
├── apps/
│   ├── backend/                  # NestJS API (port 3001)
│   │   └── src/
│   │       ├── ingestion/        # Upload, parse, chunk, embed, store
│   │       ├── embedding/        # HuggingFace API client
│   │       ├── vector-store/     # Pinecone client
│   │       ├── retrieval/        # Semantic search
│   │       └── chat/             # Groq LLM integration
│   └── frontend/                 # Next.js 14 (port 3000)
│       ├── app/                  # App Router pages
│       ├── components/           # DocumentUpload, ChatWindow, MessageBubble
│       └── lib/api.ts            # Typed API client
└── package.json                  # npm workspaces root
```

---

## Production Note

⚠️ **CORS is currently set to `*`** for development convenience. Before deploying to production, restrict CORS to your frontend domain in `apps/backend/src/main.ts`:

```ts
app.enableCors({ origin: 'https://your-frontend-domain.com' });
```
