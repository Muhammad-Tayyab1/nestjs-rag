# Setup Guide

Complete instructions for local development and production deployment.

---

## Prerequisites

- Node.js 18+ and npm 9+
- Git

Check versions:

```bash
node -v   # should be 18+
npm -v    # should be 9+
```

---

## Part 1 — Get Free API Keys

You need three accounts. No credit card required for any of them.

### Groq (LLM)

1. Go to [console.groq.com](https://console.groq.com) → Sign Up
2. Left sidebar → **API Keys** → **Create API Key**
3. Name it `nestjs-rag` → Submit
4. Copy the key — starts with `gsk_...` — you won't see it again

### Pinecone (Vector Database)

1. Go to [app.pinecone.io](https://app.pinecone.io) → Sign Up Free
2. Click **Create Index**:
   - **Index name:** `nestjs-rag`
   - **Dimensions:** `384`
   - **Metric:** `Cosine`
   - **Plan:** Free (Serverless)
3. Click **Create Index** — wait ~30 seconds
4. Left sidebar → **API Keys** → copy the default key

### HuggingFace (Embeddings)

1. Go to [huggingface.co](https://huggingface.co) → Sign Up
2. Avatar (top right) → **Settings** → **Access Tokens**
3. **New token** → name `nestjs-rag`, role **Read** → Create
4. Copy the token — starts with `hf_...`

---

## Part 2 — Local Development

### 1. Clone and install

```bash
git clone https://github.com/Muhammad-Tayyab1/nestjs-rag.git
cd nestjs-rag
npm install
```

This installs dependencies for both apps via npm workspaces.

### 2. Configure environment variables

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local
```

Open `apps/backend/.env` and fill in your keys:

```env
GROQ_API_KEY=gsk_...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=nestjs-rag
HUGGINGFACE_API_KEY=hf_...
PORT=3001
```

`apps/frontend/.env.local` is already configured for local dev:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Start the backend

```bash
npm run dev:backend
```

Expected output:

```
Backend running on port 3001
Swagger docs at http://localhost:3001/api/docs
```

Verify it's working:

```bash
curl http://localhost:3001/api/health
# → {"status":"ok","timestamp":"..."}
```

### 4. Start the frontend

Open a second terminal:

```bash
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Try it out

1. Drop a PDF, TXT, MD, or DOCX into the sidebar upload zone (max 10MB)
2. Wait for processing — a progress bar shows while it embeds and stores in Pinecone
3. The document appears in the **Knowledge Base** list
4. Type a question in the chat and press **Enter**
5. The AI answers using only your document's content, with source citations

---

## Part 3 — Deploy Backend to Render

### 1. Push your code to GitHub

Make sure all changes are committed and pushed to your GitHub repo.

### 2. Create a Web Service on Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub account and select the `nestjs-rag` repo
3. Configure the service:

| Field | Value |
|---|---|
| **Root Directory** | `apps/backend` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start:prod` |

4. Click **Create Web Service**

### 3. Add environment variables

In the Render dashboard → **Environment** tab, add:

```
GROQ_API_KEY=gsk_...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=nestjs-rag
HUGGINGFACE_API_KEY=hf_...
```

> Do not add `PORT` — Render sets it automatically.

### 4. Deploy and verify

Once deployed, your backend URL will be something like:
`https://nestjs-rag-backend.onrender.com`

Verify it's running:

```bash
curl https://nestjs-rag-backend.onrender.com/api/health
# → {"status":"ok","timestamp":"..."}
```

Swagger docs: `https://nestjs-rag-backend.onrender.com/api/docs`

> **Note:** Render free tier spins down after 15 minutes of inactivity. The first request after sleep takes ~30 seconds to wake up.

---

## Part 4 — Deploy Frontend to Vercel

### 1. Create a project on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `apps/frontend`
4. Framework will be auto-detected as **Next.js**

### 2. Add environment variable

In the Vercel project settings → **Environment Variables**:

```
NEXT_PUBLIC_API_URL=https://your-render-url.onrender.com
```

Replace the URL with your actual Render backend URL.

### 3. Deploy

Click **Deploy**. Vercel builds and serves the Next.js app automatically on every push to `main`.

---

## Running Tests

```bash
cd apps/backend && npx jest --no-coverage
# Expected: 6 suites, 18 tests — no API keys needed
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Upload fails with 502 | Check `HUGGINGFACE_API_KEY` and `PINECONE_API_KEY` — verify Pinecone index has 384 dims + cosine metric |
| Chat returns 502 | Check `GROQ_API_KEY` — verify backend is running |
| Frontend can't reach backend | Confirm `NEXT_PUBLIC_API_URL` points to the correct backend URL |
| First embed is slow (10–20s) | HuggingFace free tier cold-starts after inactivity — expected behaviour |
| Render deploy fails | Confirm Start Command is `npm run start:prod`, not `npm start` |
| Documents lost after Render redeploy | In-memory registry resets on restart — by design (no persistent database) |
| Rate limit error (429) | API is limited to 30 requests/minute per IP |
