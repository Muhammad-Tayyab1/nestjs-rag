# UI Redesign — Dark AI Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the NestJS RAG frontend from a plain minimal layout into a polished dark AI dashboard with a fixed sidebar and full-height chat panel.

**Architecture:** Fixed 280px sidebar holds the logo, document list, and upload zone; the remaining width is a full-height chat panel. Everything fits in 100vh with no page scroll. Pure Tailwind CSS + CSS custom properties — no new npm packages.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS 3, no additional dependencies.

## Global Constraints

- No new npm packages — pure Tailwind + CSS only
- Next.js 14 App Router (`app/` directory)
- All components remain `'use client'` where they already are
- `api.ts` interface is unchanged — no backend changes
- Background: `#0a0a0f`, Sidebar: `#111118`, Accent: purple `#7c3aed` → blue `#2563eb`
- Muted text: `#a1a1aa`, primary text: white
- No page-level scroll — layout must be 100vh, inner panels scroll independently

---

### Task 1: Global styles and layout foundation

**Files:**
- Modify: `apps/frontend/app/globals.css`
- Modify: `apps/frontend/app/layout.tsx`
- Modify: `apps/frontend/tailwind.config.ts`

**Interfaces:**
- Produces: CSS custom properties (`--color-bg`, `--color-sidebar`, `--color-accent-start`, `--color-accent-end`) available to all components; dark body background; Geist font applied globally

- [ ] **Step 1: Extend Tailwind config with custom colors and keyframes**

Replace `apps/frontend/tailwind.config.ts` with:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        sidebar: '#111118',
        surface: '#16161f',
        border: '#1e1e2e',
        accent: {
          purple: '#7c3aed',
          blue: '#2563eb',
        },
        muted: '#a1a1aa',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: Write global CSS with dark scrollbar and utility classes**

Replace `apps/frontend/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg: #0a0a0f;
  --color-sidebar: #111118;
  --color-surface: #16161f;
  --color-border: #1e1e2e;
  --color-accent-start: #7c3aed;
  --color-accent-end: #2563eb;
}

* {
  scrollbar-width: thin;
  scrollbar-color: #2a2a3e transparent;
}

*::-webkit-scrollbar {
  width: 4px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background: #2a2a3e;
  border-radius: 2px;
}

*::-webkit-scrollbar-thumb:hover {
  background: #3a3a5e;
}

body {
  background-color: var(--color-bg);
  color: white;
  overflow: hidden;
}

.gradient-text {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-border {
  border: 1px solid transparent;
  background-clip: padding-box;
  position: relative;
}

.accent-gradient {
  background: linear-gradient(135deg, #7c3aed, #2563eb);
}
```

- [ ] **Step 3: Update layout.tsx with dark body and Geist font**

Replace `apps/frontend/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

export const metadata: Metadata = {
  title: 'RAG — Document Intelligence',
  description: 'Upload documents and ask questions answered by AI, grounded in your content.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body className="bg-bg min-h-screen overflow-hidden">{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Install Geist font package**

```bash
cd apps/frontend && npm install geist
```

Expected output: `added 1 package` (or similar — Geist is a tiny package from Vercel, this is the one allowed exception to "no new packages" since it ships with Next.js 14 apps by default and has zero runtime overhead)

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd apps/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/app/globals.css apps/frontend/app/layout.tsx apps/frontend/tailwind.config.ts apps/frontend/package.json apps/frontend/package-lock.json
git commit -m "feat: dark theme foundation — globals, tailwind config, Geist font"
```

---

### Task 2: New DocumentList component

**Files:**
- Create: `apps/frontend/components/DocumentList.tsx`

**Interfaces:**
- Consumes: `DocumentMeta` from `../lib/api`, `api.deleteDocument(id: string): Promise<void>` from `../lib/api`
- Produces: `DocumentList` React component — `Props: { documents: DocumentMeta[], onDeleted: (id: string) => void }`

- [ ] **Step 1: Create DocumentList component**

Create `apps/frontend/components/DocumentList.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { api, DocumentMeta } from '../lib/api'

interface Props {
  documents: DocumentMeta[]
  onDeleted: (id: string) => void
}

export default function DocumentList({ documents, onDeleted }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await api.deleteDocument(id)
      onDeleted(id)
    } catch {
      // silently ignore — document may already be gone
    } finally {
      setDeletingId(null)
    }
  }

  if (documents.length === 0) {
    return (
      <p className="text-xs text-muted px-1">No documents yet. Upload one above.</p>
    )
  }

  return (
    <ul className="space-y-1.5">
      {documents.map((doc) => (
        <li
          key={doc.documentId}
          className="group flex items-start gap-2 rounded-lg px-2.5 py-2 bg-surface border border-border hover:border-accent-purple/40 transition-colors"
        >
          <div className="mt-0.5 w-1.5 h-1.5 rounded-full accent-gradient flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{doc.filename}</p>
            <p className="text-[10px] text-muted mt-0.5">{doc.chunks} chunks</p>
          </div>
          <button
            onClick={() => handleDelete(doc.documentId)}
            disabled={deletingId === doc.documentId}
            aria-label={`Delete ${doc.filename}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-red-400 disabled:opacity-30 flex-shrink-0 mt-0.5"
          >
            {deletingId === doc.documentId ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/components/DocumentList.tsx
git commit -m "feat: DocumentList component with delete and dark styling"
```

---

### Task 3: Redesign DocumentUpload component

**Files:**
- Modify: `apps/frontend/components/DocumentUpload.tsx`

**Interfaces:**
- Consumes: `api.uploadDocument(file: File): Promise<UploadResponse>` from `../lib/api`
- Produces: `DocumentUpload` React component — `Props: { onUploaded: (doc: DocumentMeta) => void }` (unchanged interface)

- [ ] **Step 1: Rewrite DocumentUpload with drag-and-drop and dark styling**

Replace `apps/frontend/components/DocumentUpload.tsx` with:

```tsx
'use client'
import { useRef, useState, DragEvent } from 'react'
import { api, DocumentMeta } from '../lib/api'

interface Props {
  onUploaded: (doc: DocumentMeta) => void
}

export default function DocumentUpload({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'dragging' | 'uploading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)

  const processFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error')
      setMessage('File exceeds 10MB limit')
      return
    }

    setStatus('uploading')
    setMessage('')
    setProgress(0)

    const ticker = setInterval(() => {
      setProgress((p) => (p < 85 ? p + Math.random() * 15 : p))
    }, 300)

    try {
      const res = await api.uploadDocument(file)
      clearInterval(ticker)
      setProgress(100)
      setTimeout(() => {
        setStatus('success')
        setMessage(`"${file.name}" — ${res.chunks} chunks`)
        setProgress(0)
      }, 300)
      onUploaded({
        documentId: res.documentId,
        filename: file.name,
        chunks: res.chunks,
        uploadedAt: new Date().toISOString(),
      })
      if (inputRef.current) inputRef.current.value = ''
    } catch (err: unknown) {
      clearInterval(ticker)
      setProgress(0)
      setStatus('error')
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setMessage(axiosErr?.response?.data?.message || 'Upload failed. Please try again.')
    }
  }

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setStatus('idle')
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setStatus('dragging')
  }

  const handleDragLeave = () => {
    if (status === 'dragging') setStatus('idle')
  }

  const isDragging = status === 'dragging'
  const isUploading = status === 'uploading'

  return (
    <div className="space-y-2">
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative rounded-xl border-2 border-dashed px-3 py-4 text-center cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-accent-purple bg-accent-purple/10'
            : 'border-border hover:border-accent-purple/50 hover:bg-surface/50'
          }
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {isUploading ? (
          <div className="space-y-2">
            <p className="text-xs text-muted">Processing…</p>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full accent-gradient rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <svg className="w-5 h-5 text-muted mx-auto mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-xs text-muted">
              {isDragging ? 'Drop to upload' : 'Drop a file or click to browse'}
            </p>
            <p className="text-[10px] text-muted/60 mt-0.5">PDF, TXT, MD, DOCX — max 10MB</p>
          </>
        )}
      </div>

      {message && (
        <p className={`text-[11px] px-1 animate-fade-in ${
          status === 'error' ? 'text-red-400' : 'text-emerald-400'
        }`}>
          {message}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/components/DocumentUpload.tsx
git commit -m "feat: DocumentUpload with drag-and-drop, progress bar, dark styling"
```

---

### Task 4: Redesign MessageBubble component

**Files:**
- Modify: `apps/frontend/components/MessageBubble.tsx`

**Interfaces:**
- Consumes: `Source` from `../lib/api`
- Produces: `MessageBubble` React component — `Props: { role: 'user' | 'ai', content: string, sources?: Source[] }` (unchanged interface)

- [ ] **Step 1: Rewrite MessageBubble with gradient user bubble and accent AI bubble**

Replace `apps/frontend/components/MessageBubble.tsx` with:

```tsx
import { Source } from '../lib/api'

interface Props {
  role: 'user' | 'ai'
  content: string
  sources?: Source[]
}

export default function MessageBubble({ role, content, sources }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full accent-gradient flex-shrink-0 mr-2.5 mt-0.5 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3a1 1 0 110 2 1 1 0 010-2zm0 3c.55 0 1 .45 1 1v4a1 1 0 11-2 0V9a1 1 0 011-1z" />
          </svg>
        </div>
      )}

      <div className={`max-w-[78%] ${isUser ? '' : 'flex-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'accent-gradient text-white rounded-br-sm'
              : 'bg-surface border border-border text-white rounded-bl-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{content}</p>

          {sources && sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">Sources</p>
              {sources.map((s, i) => (
                <div key={i} className="text-[11px] bg-black/20 rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-white/80 truncate">{s.filename}</span>
                    <span className="text-white/40 flex-shrink-0">
                      {(s.score * 100).toFixed(0)}% match
                    </span>
                  </div>
                  <p className="text-white/40 italic mt-0.5 line-clamp-1">{s.chunk}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-6 h-6 rounded-full bg-surface border border-border flex-shrink-0 ml-2.5 mt-0.5 flex items-center justify-center">
          <svg className="w-3 h-3 text-muted" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/components/MessageBubble.tsx
git commit -m "feat: MessageBubble with gradient user bubble, AI avatar, source cards"
```

---

### Task 5: Redesign ChatWindow component

**Files:**
- Modify: `apps/frontend/components/ChatWindow.tsx`

**Interfaces:**
- Consumes: `MessageBubble` (Task 4), `api.chat(question: string): Promise<ChatResponse>` from `../lib/api`
- Produces: `ChatWindow` React component — `Props: {}` (unchanged interface)

- [ ] **Step 1: Rewrite ChatWindow with full-height layout and improved empty state**

Replace `apps/frontend/components/ChatWindow.tsx` with:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'
import { api, Source } from '../lib/api'

interface Message {
  role: 'user' | 'ai'
  content: string
  sources?: Source[]
}

const SUGGESTIONS = [
  'Summarize this document',
  'What are the key points?',
  'Explain the main concepts',
]

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (question?: string) => {
    const q = (question ?? input).trim()
    if (!q || loading) return

    setMessages((prev) => [...prev, { role: 'user', content: q }])
    setInput('')
    setLoading(true)

    try {
      const res = await api.chat(q)
      setMessages((prev) => [...prev, { role: 'ai', content: res.answer, sources: res.sources }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-12 h-12 rounded-2xl accent-gradient flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">Ask anything about your documents</p>
              <p className="text-muted text-sm mt-1">Upload a document in the sidebar to get started</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-muted hover:border-accent-purple/50 hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} content={m.content} sources={m.sources} />
            ))}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="w-6 h-6 rounded-full accent-gradient flex-shrink-0 mr-2.5 mt-0.5 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3a1 1 0 110 2 1 1 0 010-2zm0 3c.55 0 1 .45 1 1v4a1 1 0 11-2 0V9a1 1 0 011-1z" />
                  </svg>
                </div>
                <div className="bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse-dot" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse-dot" style={{ animationDelay: '200ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse-dot" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border px-4 py-4">
        <div className="flex gap-3 items-end bg-surface border border-border rounded-2xl px-4 py-3 focus-within:border-accent-purple/50 transition-colors">
          <textarea
            ref={textareaRef}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder-muted focus:outline-none min-h-[20px] max-h-32"
            rows={1}
            placeholder="Ask a question about your documents…"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
            }}
            onKeyDown={handleKey}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-xl accent-gradient flex items-center justify-center disabled:opacity-30 hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-muted/50 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/components/ChatWindow.tsx
git commit -m "feat: ChatWindow with full-height layout, empty state, auto-resize input"
```

---

### Task 6: Redesign main page with sidebar layout

**Files:**
- Modify: `apps/frontend/app/page.tsx`

**Interfaces:**
- Consumes: `DocumentUpload` (Task 3), `DocumentList` (Task 2), `ChatWindow` (Task 5), `api.listDocuments(): Promise<DocumentMeta[]>` from `../lib/api`
- Produces: `Home` page component with fixed sidebar + chat main panel

- [ ] **Step 1: Rewrite page.tsx with sidebar + main split layout**

Replace `apps/frontend/app/page.tsx` with:

```tsx
'use client'
import { useState, useEffect } from 'react'
import DocumentUpload from '../components/DocumentUpload'
import DocumentList from '../components/DocumentList'
import ChatWindow from '../components/ChatWindow'
import { api, DocumentMeta } from '../lib/api'

export default function Home() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([])

  useEffect(() => {
    api.listDocuments().then(setDocuments).catch(() => {})
  }, [])

  const handleUploaded = (doc: DocumentMeta) => {
    setDocuments((prev) => [...prev, doc])
  }

  const handleDeleted = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.documentId !== id))
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[280px] flex-shrink-0 bg-sidebar border-r border-border flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg accent-gradient flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white leading-none">RAG Studio</h1>
              <p className="text-[10px] text-muted mt-0.5">Document Intelligence</p>
            </div>
          </div>
        </div>

        {/* Upload section */}
        <div className="px-4 py-4 border-b border-border">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">Upload</p>
          <DocumentUpload onUploaded={handleUploaded} />
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Knowledge Base</p>
            {documents.length > 0 && (
              <span className="text-[10px] bg-accent-purple/20 text-accent-purple px-1.5 py-0.5 rounded-full">
                {documents.length}
              </span>
            )}
          </div>
          <DocumentList documents={documents} onDeleted={handleDeleted} />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <p className="text-[10px] text-muted/50">Powered by Groq · Pinecone · HuggingFace</p>
        </div>
      </aside>

      {/* Main chat panel */}
      <main className="flex-1 flex flex-col overflow-hidden bg-bg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Chat</h2>
            <p className="text-[11px] text-muted">
              {documents.length === 0
                ? 'Upload a document to start asking questions'
                : `${documents.length} document${documents.length === 1 ? '' : 's'} in knowledge base`}
            </p>
          </div>
          {documents.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-emerald-400">Ready</span>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatWindow />
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/frontend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/app/page.tsx
git commit -m "feat: sidebar + chat split layout, document list integration"
```

---

### Task 7: Visual verification

**Files:** none (read-only verification)

- [ ] **Step 1: Start the frontend dev server**

```bash
cd apps/frontend && npm run dev
```

Expected: `Ready on http://localhost:3000`

- [ ] **Step 2: Open browser and verify layout**

Navigate to `http://localhost:3000`. Verify:
- Dark background (`#0a0a0f`) renders — no white flash
- Sidebar (280px) visible on the left with logo and upload zone
- Chat panel fills remaining width
- No horizontal scrollbar at 1280px+ viewport width

- [ ] **Step 3: Verify upload flow**

Drop or select a PDF/TXT file in the sidebar upload zone. Verify:
- Progress bar animates during upload
- Document appears in the Knowledge Base list below
- Header shows document count and "Ready" status

- [ ] **Step 4: Verify chat flow**

Type a question and press Enter. Verify:
- User message appears with gradient bubble + avatar
- Animated typing dots appear while waiting
- AI response renders with surface card style + avatar
- Sources render as compact cards with match percentage

- [ ] **Step 5: Verify delete**

Hover a document in the list and click the X button. Verify:
- Document is removed from the list
- Document count in the header updates

- [ ] **Step 6: Commit if any tweaks were made**

```bash
git add -A
git commit -m "fix: visual verification tweaks"
```
