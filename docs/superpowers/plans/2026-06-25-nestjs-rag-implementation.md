# NestJS RAG System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack RAG system — NestJS backend + Next.js 14 frontend — that lets users upload documents and ask questions answered by an LLM grounded in the document content.

**Architecture:** Monorepo with npm workspaces. Backend (NestJS, port 3001) handles ingestion, embedding, vector storage, retrieval, and chat. Frontend (Next.js 14, port 3000) provides upload and chat UI. All external services are free cloud APIs.

**Tech Stack:** NestJS, Next.js 14 (App Router), Tailwind CSS, Groq SDK (`groq-sdk`), HuggingFace Inference API (HTTP), Pinecone (`@pinecone-database/pinecone`), pdf-parse, mammoth, multer, axios, Jest, React Testing Library.

## Global Constraints

- Backend runs on port 3001; frontend on port 3000
- Embedding model: `sentence-transformers/all-MiniLM-L6-v2` — 384 dimensions, cosine similarity
- LLM: `llama-3.3-70b-versatile` via Groq API
- Pinecone index: 384 dimensions, cosine metric, named `nestjs-rag`
- Chunk size: 2000 characters; overlap: 200 characters (≈500/50 tokens)
- Top-K retrieval: 5 chunks per query
- File size limit: 10MB
- Supported formats: PDF, TXT, MD, DOCX
- No authentication — open API for portfolio demo
- No streaming — LLM response returned as single block
- Commit name: `muhammad-tayyab1` — configure per-repo git config

---

## File Map

```
nestjs-rag/
├── package.json                                        # npm workspaces root
├── .gitignore
├── README.md
└── apps/
    ├── backend/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── .env.example
    │   └── src/
    │       ├── main.ts                                 # Bootstrap, CORS, prefix, file limit
    │       ├── app.module.ts                           # Root module wiring
    │       ├── common/
    │       │   ├── dto/
    │       │   │   ├── query.dto.ts                    # { question: string }
    │       │   │   ├── upload-response.dto.ts          # { message, documentId, chunks }
    │       │   │   └── chat-response.dto.ts            # { answer, sources[] }
    │       │   └── filters/
    │       │       └── http-exception.filter.ts        # Global error envelope
    │       ├── embedding/
    │       │   ├── embedding.module.ts
    │       │   ├── embedding.service.ts                # HuggingFace embed(text) → number[]
    │       │   └── embedding.service.spec.ts
    │       ├── vector-store/
    │       │   ├── vector-store.module.ts
    │       │   ├── vector-store.service.ts             # Pinecone upsert/search/delete/list
    │       │   └── vector-store.service.spec.ts
    │       ├── ingestion/
    │       │   ├── ingestion.module.ts
    │       │   ├── ingestion.controller.ts             # POST /upload, GET /documents, DELETE /:id
    │       │   ├── ingestion.service.ts                # Parse → chunk → embed → store
    │       │   ├── ingestion.service.spec.ts
    │       │   └── parsers/
    │       │       ├── pdf.parser.ts
    │       │       ├── txt.parser.ts
    │       │       ├── md.parser.ts
    │       │       ├── docx.parser.ts
    │       │       └── parsers.spec.ts
    │       ├── retrieval/
    │       │   ├── retrieval.module.ts
    │       │   ├── retrieval.service.ts                # embed query → Pinecone search → chunks
    │       │   └── retrieval.service.spec.ts
    │       └── chat/
    │           ├── chat.module.ts
    │           ├── chat.controller.ts                  # POST /query
    │           ├── chat.service.ts                     # Build prompt → Groq → response
    │           └── chat.service.spec.ts
    └── frontend/
        ├── package.json
        ├── tsconfig.json
        ├── tailwind.config.ts
        ├── .env.local.example
        └── app/
            ├── layout.tsx
            ├── page.tsx                                # Main page — upload + chat
            └── globals.css
        └── components/
            ├── DocumentUpload.tsx                      # File picker, progress, status
            ├── ChatWindow.tsx                          # Message list, scroll-to-bottom
            └── MessageBubble.tsx                       # User/AI bubble + sources
        └── lib/
            └── api.ts                                  # Axios API client
```

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json` (root)
- Create: `.gitignore`
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/backend/.env.example`
- Create: `apps/frontend/package.json`
- Create: `apps/frontend/tsconfig.json`
- Create: `apps/frontend/.env.local.example`

**Interfaces:**
- Produces: runnable `npm install` at root; `npm run dev` in each app

- [ ] **Step 1: Create root workspace package.json**

```json
{
  "name": "nestjs-rag",
  "private": true,
  "workspaces": ["apps/backend", "apps/frontend"],
  "scripts": {
    "dev:backend": "npm run start:dev --workspace=apps/backend",
    "dev:frontend": "npm run dev --workspace=apps/frontend"
  }
}
```

- [ ] **Step 2: Create apps/backend/package.json**

```json
{
  "name": "backend",
  "version": "1.0.0",
  "scripts": {
    "build": "nest build",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@pinecone-database/pinecone": "^3.0.0",
    "groq-sdk": "^0.7.0",
    "axios": "^1.6.0",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.7.0",
    "uuid": "^9.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/express": "^4.17.21",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.0.0",
    "@types/pdf-parse": "^1.1.4",
    "@types/uuid": "^9.0.7",
    "@types/jest": "^29.5.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "typescript": "^5.0.0"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 3: Create apps/backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  }
}
```

- [ ] **Step 4: Create apps/backend/.env.example**

```env
GROQ_API_KEY=your_groq_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=nestjs-rag
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
PORT=3001
```

- [ ] **Step 5: Create apps/frontend/package.json**

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jest": "^29.5.0",
    "jest-environment-jsdom": "^29.5.0",
    "ts-jest": "^29.1.0"
  }
}
```

- [ ] **Step 6: Create apps/frontend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 7: Create apps/frontend/.env.local.example**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

- [ ] **Step 8: Install dependencies**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
npm install
```

Expected: `node_modules` installed in both apps via workspaces.

- [ ] **Step 9: Commit**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add package.json apps/
git commit -m "chore: monorepo scaffolding with backend and frontend workspaces"
```

---

## Task 2: Backend — Common DTOs and Global Exception Filter

**Files:**
- Create: `apps/backend/src/common/dto/query.dto.ts`
- Create: `apps/backend/src/common/dto/upload-response.dto.ts`
- Create: `apps/backend/src/common/dto/chat-response.dto.ts`
- Create: `apps/backend/src/common/filters/http-exception.filter.ts`

**Interfaces:**
- Produces: `QueryDto`, `UploadResponseDto`, `ChatResponseDto`, `HttpExceptionFilter` — used by controllers and services in Tasks 6, 8

- [ ] **Step 1: Create query.dto.ts**

```typescript
// apps/backend/src/common/dto/query.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class QueryDto {
  @IsString()
  @IsNotEmpty({ message: 'Question cannot be empty' })
  question: string;
}
```

- [ ] **Step 2: Create upload-response.dto.ts**

```typescript
// apps/backend/src/common/dto/upload-response.dto.ts
export class UploadResponseDto {
  message: string;
  documentId: string;
  chunks: number;
}
```

- [ ] **Step 3: Create chat-response.dto.ts**

```typescript
// apps/backend/src/common/dto/chat-response.dto.ts
export class SourceDto {
  filename: string;
  chunk: string;
  score: number;
}

export class ChatResponseDto {
  answer: string;
  sources: SourceDto[];
}
```

- [ ] **Step 4: Create global exception filter**

```typescript
// apps/backend/src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any).message || exception.message
        : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add apps/backend/src/common/
git commit -m "feat: add common DTOs and global exception filter"
```

---

## Task 3: Backend — Embedding Service

**Files:**
- Create: `apps/backend/src/embedding/embedding.module.ts`
- Create: `apps/backend/src/embedding/embedding.service.ts`
- Create: `apps/backend/src/embedding/embedding.service.spec.ts`

**Interfaces:**
- Produces:
  - `EmbeddingService.embed(text: string): Promise<number[]>`
  - `EmbeddingService.embedBatch(texts: string[]): Promise<number[][]>`
- Consumed by: `VectorStoreService` (Task 4), `RetrievalService` (Task 7)

- [ ] **Step 1: Write the failing test**

```typescript
// apps/backend/src/embedding/embedding.service.spec.ts
import { Test } from '@nestjs/testing';
import { EmbeddingService } from './embedding.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [EmbeddingService],
    }).compile();
    service = module.get<EmbeddingService>(EmbeddingService);
    process.env.HUGGINGFACE_API_KEY = 'test-key';
  });

  it('embed returns a number array of length 384', async () => {
    const fakeVector = Array(384).fill(0.1);
    mockedAxios.post = jest.fn().mockResolvedValue({ data: [fakeVector] });

    const result = await service.embed('hello world');

    expect(result).toHaveLength(384);
    expect(typeof result[0]).toBe('number');
  });

  it('embedBatch returns one vector per text', async () => {
    const fakeVectors = [Array(384).fill(0.1), Array(384).fill(0.2)];
    mockedAxios.post = jest.fn().mockResolvedValue({ data: fakeVectors });

    const result = await service.embedBatch(['text one', 'text two']);

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveLength(384);
  });

  it('throws BadGatewayException on API failure', async () => {
    mockedAxios.post = jest.fn().mockRejectedValue(new Error('Network error'));

    await expect(service.embed('test')).rejects.toThrow('Embedding service unavailable');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest embedding.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './embedding.service'`

- [ ] **Step 3: Create embedding.service.ts**

```typescript
// apps/backend/src/embedding/embedding.service.ts
import { Injectable, BadGatewayException } from '@nestjs/common';
import axios from 'axios';

const HF_API_URL =
  'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

@Injectable()
export class EmbeddingService {
  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await axios.post(
        HF_API_URL,
        { inputs: texts },
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data as number[][];
    } catch {
      throw new BadGatewayException('Embedding service unavailable. Please try again.');
    }
  }
}
```

- [ ] **Step 4: Create embedding.module.ts**

```typescript
// apps/backend/src/embedding/embedding.module.ts
import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';

@Module({
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest embedding.service.spec.ts --no-coverage
```

Expected: PASS — 3 tests pass

- [ ] **Step 6: Commit**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add apps/backend/src/embedding/
git commit -m "feat: add embedding service with HuggingFace inference API"
```

---

## Task 4: Backend — Vector Store Service (Pinecone)

**Files:**
- Create: `apps/backend/src/vector-store/vector-store.module.ts`
- Create: `apps/backend/src/vector-store/vector-store.service.ts`
- Create: `apps/backend/src/vector-store/vector-store.service.spec.ts`

**Interfaces:**
- Produces:
  - `VectorStoreService.upsert(vectors: VectorRecord[]): Promise<void>`
  - `VectorStoreService.similaritySearch(vector: number[], topK: number): Promise<SearchResult[]>`
  - `VectorStoreService.deleteByDocumentId(documentId: string, chunkCount: number): Promise<void>`
  - `VectorStoreService.listDocuments(): DocumentMeta[]`
  - `VectorStoreService.registerDocument(meta: DocumentMeta): void`
  - `VectorStoreService.removeDocument(documentId: string): void`

Types produced:
```typescript
interface VectorRecord {
  id: string;           // format: `${documentId}-${chunkIndex}`
  values: number[];     // 384-dim embedding
  metadata: {
    filename: string;
    documentId: string;
    chunkIndex: number;
    uploadedAt: string;
    text: string;
  };
}

interface SearchResult {
  filename: string;
  documentId: string;
  text: string;
  score: number;
}

interface DocumentMeta {
  documentId: string;
  filename: string;
  chunks: number;
  uploadedAt: string;
}
```

- [ ] **Step 1: Write the failing test**

```typescript
// apps/backend/src/vector-store/vector-store.service.spec.ts
import { Test } from '@nestjs/testing';
import { VectorStoreService } from './vector-store.service';

const mockUpsert = jest.fn().mockResolvedValue({});
const mockQuery = jest.fn().mockResolvedValue({
  matches: [
    {
      score: 0.92,
      metadata: {
        filename: 'test.pdf',
        documentId: 'doc-1',
        text: 'relevant chunk text',
      },
    },
  ],
});
const mockDeleteMany = jest.fn().mockResolvedValue({});
const mockIndex = jest.fn().mockReturnValue({
  upsert: mockUpsert,
  query: mockQuery,
  deleteMany: mockDeleteMany,
});

jest.mock('@pinecone-database/pinecone', () => ({
  Pinecone: jest.fn().mockImplementation(() => ({ index: mockIndex })),
}));

describe('VectorStoreService', () => {
  let service: VectorStoreService;

  beforeEach(async () => {
    process.env.PINECONE_API_KEY = 'test-key';
    process.env.PINECONE_INDEX_NAME = 'nestjs-rag';
    const module = await Test.createTestingModule({
      providers: [VectorStoreService],
    }).compile();
    service = module.get<VectorStoreService>(VectorStoreService);
  });

  it('upsert calls Pinecone upsert with correct payload', async () => {
    const vectors = [{
      id: 'doc-1-0',
      values: Array(384).fill(0.1),
      metadata: { filename: 'test.pdf', documentId: 'doc-1', chunkIndex: 0, uploadedAt: '2026-06-25', text: 'hello' },
    }];
    await service.upsert(vectors);
    expect(mockUpsert).toHaveBeenCalledWith(vectors);
  });

  it('similaritySearch returns SearchResult array', async () => {
    const results = await service.similaritySearch(Array(384).fill(0.1), 5);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.92);
    expect(results[0].filename).toBe('test.pdf');
    expect(results[0].text).toBe('relevant chunk text');
  });

  it('registerDocument and listDocuments roundtrip', () => {
    service.registerDocument({ documentId: 'doc-1', filename: 'test.pdf', chunks: 5, uploadedAt: '2026-06-25' });
    const docs = service.listDocuments();
    expect(docs).toHaveLength(1);
    expect(docs[0].filename).toBe('test.pdf');
  });

  it('removeDocument removes from registry', () => {
    service.registerDocument({ documentId: 'doc-2', filename: 'other.pdf', chunks: 3, uploadedAt: '2026-06-25' });
    service.removeDocument('doc-2');
    const docs = service.listDocuments();
    expect(docs.find(d => d.documentId === 'doc-2')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest vector-store.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './vector-store.service'`

- [ ] **Step 3: Create vector-store.service.ts**

```typescript
// apps/backend/src/vector-store/vector-store.service.ts
import { Injectable, BadGatewayException } from '@nestjs/common';
import { Pinecone } from '@pinecone-database/pinecone';

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    filename: string;
    documentId: string;
    chunkIndex: number;
    uploadedAt: string;
    text: string;
  };
}

export interface SearchResult {
  filename: string;
  documentId: string;
  text: string;
  score: number;
}

export interface DocumentMeta {
  documentId: string;
  filename: string;
  chunks: number;
  uploadedAt: string;
}

@Injectable()
export class VectorStoreService {
  private readonly pinecone: Pinecone;
  private readonly indexName: string;
  private readonly documentRegistry: Map<string, DocumentMeta> = new Map();

  constructor() {
    this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    this.indexName = process.env.PINECONE_INDEX_NAME || 'nestjs-rag';
  }

  private get index() {
    return this.pinecone.index(this.indexName);
  }

  async upsert(vectors: VectorRecord[]): Promise<void> {
    try {
      await this.index.upsert(vectors);
    } catch {
      throw new BadGatewayException('Vector store unavailable. Please try again.');
    }
  }

  async similaritySearch(vector: number[], topK: number): Promise<SearchResult[]> {
    try {
      const result = await this.index.query({
        vector,
        topK,
        includeMetadata: true,
      });
      return (result.matches || []).map((match) => ({
        filename: (match.metadata as any).filename,
        documentId: (match.metadata as any).documentId,
        text: (match.metadata as any).text,
        score: match.score || 0,
      }));
    } catch {
      throw new BadGatewayException('Vector store unavailable. Please try again.');
    }
  }

  async deleteByDocumentId(documentId: string, chunkCount: number): Promise<void> {
    try {
      const ids = Array.from({ length: chunkCount }, (_, i) => `${documentId}-${i}`);
      await this.index.deleteMany(ids);
    } catch {
      throw new BadGatewayException('Vector store unavailable. Please try again.');
    }
  }

  registerDocument(meta: DocumentMeta): void {
    this.documentRegistry.set(meta.documentId, meta);
  }

  removeDocument(documentId: string): void {
    this.documentRegistry.delete(documentId);
  }

  listDocuments(): DocumentMeta[] {
    return Array.from(this.documentRegistry.values());
  }
}
```

- [ ] **Step 4: Create vector-store.module.ts**

```typescript
// apps/backend/src/vector-store/vector-store.module.ts
import { Module } from '@nestjs/common';
import { VectorStoreService } from './vector-store.service';

@Module({
  providers: [VectorStoreService],
  exports: [VectorStoreService],
})
export class VectorStoreModule {}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest vector-store.service.spec.ts --no-coverage
```

Expected: PASS — 4 tests pass

- [ ] **Step 6: Commit**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add apps/backend/src/vector-store/
git commit -m "feat: add Pinecone vector store service with document registry"
```

---

## Task 5: Backend — Document Parsers

**Files:**
- Create: `apps/backend/src/ingestion/parsers/pdf.parser.ts`
- Create: `apps/backend/src/ingestion/parsers/txt.parser.ts`
- Create: `apps/backend/src/ingestion/parsers/md.parser.ts`
- Create: `apps/backend/src/ingestion/parsers/docx.parser.ts`
- Create: `apps/backend/src/ingestion/parsers/parsers.spec.ts`

**Interfaces:**
- Produces: each parser exports a function `parse(buffer: Buffer): Promise<string>`
- Consumed by: `IngestionService` (Task 6)

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/backend/src/ingestion/parsers/parsers.spec.ts
import { parsePdf } from './pdf.parser';
import { parseTxt } from './txt.parser';
import { parseMd } from './md.parser';
import { parseDocx } from './docx.parser';

jest.mock('pdf-parse', () =>
  jest.fn().mockResolvedValue({ text: 'PDF content here' }),
);
jest.mock('mammoth', () => ({
  extractRawText: jest.fn().mockResolvedValue({ value: 'DOCX content here' }),
}));

describe('Document Parsers', () => {
  it('parseTxt returns buffer as UTF-8 string', async () => {
    const buf = Buffer.from('hello text file');
    const result = await parseTxt(buf);
    expect(result).toBe('hello text file');
  });

  it('parseMd returns buffer as UTF-8 string', async () => {
    const buf = Buffer.from('# Heading\nsome content');
    const result = await parseMd(buf);
    expect(result).toBe('# Heading\nsome content');
  });

  it('parsePdf extracts text via pdf-parse', async () => {
    const buf = Buffer.from('fake-pdf-bytes');
    const result = await parsePdf(buf);
    expect(result).toBe('PDF content here');
  });

  it('parseDocx extracts text via mammoth', async () => {
    const buf = Buffer.from('fake-docx-bytes');
    const result = await parseDocx(buf);
    expect(result).toBe('DOCX content here');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest parsers.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './pdf.parser'`

- [ ] **Step 3: Create pdf.parser.ts**

```typescript
// apps/backend/src/ingestion/parsers/pdf.parser.ts
import pdfParse from 'pdf-parse';

export async function parsePdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}
```

- [ ] **Step 4: Create txt.parser.ts**

```typescript
// apps/backend/src/ingestion/parsers/txt.parser.ts
export async function parseTxt(buffer: Buffer): Promise<string> {
  return buffer.toString('utf-8');
}
```

- [ ] **Step 5: Create md.parser.ts**

```typescript
// apps/backend/src/ingestion/parsers/md.parser.ts
export async function parseMd(buffer: Buffer): Promise<string> {
  return buffer.toString('utf-8');
}
```

- [ ] **Step 6: Create docx.parser.ts**

```typescript
// apps/backend/src/ingestion/parsers/docx.parser.ts
import mammoth from 'mammoth';

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest parsers.spec.ts --no-coverage
```

Expected: PASS — 4 tests pass

- [ ] **Step 8: Commit**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add apps/backend/src/ingestion/parsers/
git commit -m "feat: add document parsers for PDF, TXT, MD, DOCX"
```

---

## Task 6: Backend — Ingestion Service and Controller

**Files:**
- Create: `apps/backend/src/ingestion/ingestion.module.ts`
- Create: `apps/backend/src/ingestion/ingestion.service.ts`
- Create: `apps/backend/src/ingestion/ingestion.controller.ts`
- Create: `apps/backend/src/ingestion/ingestion.service.spec.ts`

**Interfaces:**
- Consumes: `EmbeddingService.embedBatch(texts: string[]): Promise<number[][]>`, `VectorStoreService.upsert()`, `VectorStoreService.registerDocument()`, `VectorStoreService.listDocuments()`, `VectorStoreService.removeDocument()`, `VectorStoreService.deleteByDocumentId()`
- Produces:
  - `IngestionService.ingest(file: Express.Multer.File): Promise<UploadResponseDto>`
  - `IngestionService.list(): DocumentMeta[]`
  - `IngestionService.delete(documentId: string): Promise<void>`
  - Controller: `POST /api/ingestion/upload`, `GET /api/ingestion/documents`, `DELETE /api/ingestion/:id`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/backend/src/ingestion/ingestion.service.spec.ts
import { Test } from '@nestjs/testing';
import { IngestionService } from './ingestion.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { BadRequestException } from '@nestjs/common';

const mockEmbedBatch = jest.fn().mockResolvedValue([Array(384).fill(0.1)]);
const mockUpsert = jest.fn().mockResolvedValue(undefined);
const mockRegisterDocument = jest.fn();
const mockListDocuments = jest.fn().mockReturnValue([]);
const mockRemoveDocument = jest.fn();
const mockDeleteByDocumentId = jest.fn().mockResolvedValue(undefined);

describe('IngestionService', () => {
  let service: IngestionService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: EmbeddingService, useValue: { embedBatch: mockEmbedBatch } },
        {
          provide: VectorStoreService,
          useValue: {
            upsert: mockUpsert,
            registerDocument: mockRegisterDocument,
            listDocuments: mockListDocuments,
            removeDocument: mockRemoveDocument,
            deleteByDocumentId: mockDeleteByDocumentId,
          },
        },
      ],
    }).compile();
    service = module.get<IngestionService>(IngestionService);
  });

  it('ingest rejects unsupported file type', async () => {
    const file = { originalname: 'file.xyz', buffer: Buffer.from('') } as Express.Multer.File;
    await expect(service.ingest(file)).rejects.toThrow(BadRequestException);
  });

  it('ingest processes a txt file and returns UploadResponseDto', async () => {
    const file = {
      originalname: 'test.txt',
      buffer: Buffer.from('Hello world. This is a test document with some content to embed.'),
    } as Express.Multer.File;

    const result = await service.ingest(file);

    expect(result.message).toBe('Document ingested successfully');
    expect(result.documentId).toBeDefined();
    expect(result.chunks).toBeGreaterThan(0);
    expect(mockUpsert).toHaveBeenCalled();
    expect(mockRegisterDocument).toHaveBeenCalled();
  });

  it('list returns documents from vector store', () => {
    mockListDocuments.mockReturnValueOnce([
      { documentId: 'doc-1', filename: 'test.pdf', chunks: 5, uploadedAt: '2026-06-25' },
    ]);
    const docs = service.list();
    expect(docs).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest ingestion.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './ingestion.service'`

- [ ] **Step 3: Create ingestion.service.ts**

```typescript
// apps/backend/src/ingestion/ingestion.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService, DocumentMeta } from '../vector-store/vector-store.service';
import { UploadResponseDto } from '../common/dto/upload-response.dto';
import { parsePdf } from './parsers/pdf.parser';
import { parseTxt } from './parsers/txt.parser';
import { parseMd } from './parsers/md.parser';
import { parseDocx } from './parsers/docx.parser';

const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.md', '.docx'];
const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

@Injectable()
export class IngestionService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async ingest(file: Express.Multer.File): Promise<UploadResponseDto> {
    const ext = this.getExtension(file.originalname);
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        'Unsupported file type. Use PDF, TXT, MD, or DOCX',
      );
    }

    const text = await this.parseFile(file.buffer, ext);
    const chunks = this.chunkText(text);
    const documentId = uuidv4();
    const uploadedAt = new Date().toISOString();

    const embeddings = await this.embeddingService.embedBatch(chunks);

    const vectors = chunks.map((chunk, i) => ({
      id: `${documentId}-${i}`,
      values: embeddings[i],
      metadata: {
        filename: file.originalname,
        documentId,
        chunkIndex: i,
        uploadedAt,
        text: chunk,
      },
    }));

    await this.vectorStoreService.upsert(vectors);
    this.vectorStoreService.registerDocument({
      documentId,
      filename: file.originalname,
      chunks: chunks.length,
      uploadedAt,
    });

    return { message: 'Document ingested successfully', documentId, chunks: chunks.length };
  }

  list(): DocumentMeta[] {
    return this.vectorStoreService.listDocuments();
  }

  async delete(documentId: string): Promise<void> {
    const docs = this.vectorStoreService.listDocuments();
    const doc = docs.find((d) => d.documentId === documentId);
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);

    await this.vectorStoreService.deleteByDocumentId(documentId, doc.chunks);
    this.vectorStoreService.removeDocument(documentId);
  }

  private getExtension(filename: string): string {
    return filename.slice(filename.lastIndexOf('.')).toLowerCase();
  }

  private async parseFile(buffer: Buffer, ext: string): Promise<string> {
    switch (ext) {
      case '.pdf':  return parsePdf(buffer);
      case '.txt':  return parseTxt(buffer);
      case '.md':   return parseMd(buffer);
      case '.docx': return parseDocx(buffer);
      default:      throw new BadRequestException('Unsupported file type. Use PDF, TXT, MD, or DOCX');
    }
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      chunks.push(text.slice(start, start + CHUNK_SIZE));
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
    return chunks.filter((c) => c.trim().length > 0);
  }
}
```

- [ ] **Step 4: Create ingestion.controller.ts**

```typescript
// apps/backend/src/ingestion/ingestion.controller.ts
import {
  Controller, Post, Get, Delete, Param,
  UploadedFile, UseInterceptors, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IngestionService } from './ingestion.service';

@Controller('api/ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    return this.ingestionService.ingest(file);
  }

  @Get('documents')
  list() {
    return this.ingestionService.list();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.ingestionService.delete(id);
  }
}
```

- [ ] **Step 5: Create ingestion.module.ts**

```typescript
// apps/backend/src/ingestion/ingestion.module.ts
import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';

@Module({
  imports: [EmbeddingModule, VectorStoreModule],
  controllers: [IngestionController],
  providers: [IngestionService],
})
export class IngestionModule {}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest ingestion.service.spec.ts --no-coverage
```

Expected: PASS — 3 tests pass

- [ ] **Step 7: Commit**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add apps/backend/src/ingestion/
git commit -m "feat: add ingestion service and controller for document upload"
```

---

## Task 7: Backend — Retrieval Service

**Files:**
- Create: `apps/backend/src/retrieval/retrieval.module.ts`
- Create: `apps/backend/src/retrieval/retrieval.service.ts`
- Create: `apps/backend/src/retrieval/retrieval.service.spec.ts`

**Interfaces:**
- Consumes: `EmbeddingService.embed(text: string): Promise<number[]>`, `VectorStoreService.similaritySearch(vector: number[], topK: number): Promise<SearchResult[]>`
- Produces: `RetrievalService.retrieve(question: string): Promise<SearchResult[]>`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/backend/src/retrieval/retrieval.service.spec.ts
import { Test } from '@nestjs/testing';
import { RetrievalService } from './retrieval.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';

const mockEmbed = jest.fn().mockResolvedValue(Array(384).fill(0.1));
const mockSearch = jest.fn().mockResolvedValue([
  { filename: 'doc.pdf', documentId: 'doc-1', text: 'relevant text', score: 0.9 },
]);

describe('RetrievalService', () => {
  let service: RetrievalService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RetrievalService,
        { provide: EmbeddingService, useValue: { embed: mockEmbed } },
        { provide: VectorStoreService, useValue: { similaritySearch: mockSearch } },
      ],
    }).compile();
    service = module.get<RetrievalService>(RetrievalService);
  });

  it('retrieve embeds the question and searches Pinecone with topK=5', async () => {
    const results = await service.retrieve('What is the policy?');

    expect(mockEmbed).toHaveBeenCalledWith('What is the policy?');
    expect(mockSearch).toHaveBeenCalledWith(Array(384).fill(0.1), 5);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest retrieval.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './retrieval.service'`

- [ ] **Step 3: Create retrieval.service.ts**

```typescript
// apps/backend/src/retrieval/retrieval.service.ts
import { Injectable } from '@nestjs/common';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService, SearchResult } from '../vector-store/vector-store.service';

const TOP_K = 5;

@Injectable()
export class RetrievalService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async retrieve(question: string): Promise<SearchResult[]> {
    const vector = await this.embeddingService.embed(question);
    return this.vectorStoreService.similaritySearch(vector, TOP_K);
  }
}
```

- [ ] **Step 4: Create retrieval.module.ts**

```typescript
// apps/backend/src/retrieval/retrieval.module.ts
import { Module } from '@nestjs/common';
import { RetrievalService } from './retrieval.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';

@Module({
  imports: [EmbeddingModule, VectorStoreModule],
  providers: [RetrievalService],
  exports: [RetrievalService],
})
export class RetrievalModule {}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest retrieval.service.spec.ts --no-coverage
```

Expected: PASS — 1 test passes

- [ ] **Step 6: Commit**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add apps/backend/src/retrieval/
git commit -m "feat: add retrieval service for semantic search"
```

---

## Task 8: Backend — Chat Service and Controller

**Files:**
- Create: `apps/backend/src/chat/chat.module.ts`
- Create: `apps/backend/src/chat/chat.service.ts`
- Create: `apps/backend/src/chat/chat.controller.ts`
- Create: `apps/backend/src/chat/chat.service.spec.ts`

**Interfaces:**
- Consumes: `RetrievalService.retrieve(question: string): Promise<SearchResult[]>`
- Produces: `ChatService.query(question: string): Promise<ChatResponseDto>`, Controller: `POST /api/chat/query`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/backend/src/chat/chat.service.spec.ts
import { Test } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { RetrievalService } from '../retrieval/retrieval.service';
import { BadRequestException } from '@nestjs/common';

const mockRetrieve = jest.fn().mockResolvedValue([
  { filename: 'doc.pdf', documentId: 'doc-1', text: 'Returns are allowed within 30 days.', score: 0.92 },
]);

const mockGroqCreate = jest.fn().mockResolvedValue({
  choices: [{ message: { content: 'You can return within 30 days.' } }],
});

jest.mock('groq-sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockGroqCreate } },
  })),
  __esModule: true,
}));

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: RetrievalService, useValue: { retrieve: mockRetrieve } },
      ],
    }).compile();
    service = module.get<ChatService>(ChatService);
  });

  it('query throws BadRequestException for empty question', async () => {
    await expect(service.query('')).rejects.toThrow(BadRequestException);
  });

  it('query returns answer and sources', async () => {
    const result = await service.query('What is the refund policy?');

    expect(result.answer).toBe('You can return within 30 days.');
    expect(result.sources).toHaveLength(1);
    expect(result.sources[0].filename).toBe('doc.pdf');
    expect(result.sources[0].score).toBe(0.92);
  });

  it('query calls Groq with context from retrieved chunks', async () => {
    await service.query('What is the refund policy?');

    const callArgs = mockGroqCreate.mock.calls[0][0];
    expect(callArgs.model).toBe('llama-3.3-70b-versatile');
    expect(callArgs.messages[1].content).toContain('Returns are allowed within 30 days.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest chat.service.spec.ts --no-coverage
```

Expected: FAIL — `Cannot find module './chat.service'`

- [ ] **Step 3: Create chat.service.ts**

```typescript
// apps/backend/src/chat/chat.service.ts
import { Injectable, BadRequestException, BadGatewayException } from '@nestjs/common';
import Groq from 'groq-sdk';
import { RetrievalService } from '../retrieval/retrieval.service';
import { ChatResponseDto, SourceDto } from '../common/dto/chat-response.dto';

@Injectable()
export class ChatService {
  private readonly groq: Groq;

  constructor(private readonly retrievalService: RetrievalService) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  async query(question: string): Promise<ChatResponseDto> {
    if (!question || !question.trim()) {
      throw new BadRequestException('Question cannot be empty');
    }

    const chunks = await this.retrievalService.retrieve(question);
    const context = chunks.map((c) => c.text).join('\n\n');

    let answer: string;
    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant. Answer the user question using ONLY the context provided. If the answer is not in the context, say "I could not find the answer in the uploaded documents."',
          },
          {
            role: 'user',
            content: `Context:\n${context}\n\nQuestion: ${question}`,
          },
        ],
      });
      answer = completion.choices[0]?.message?.content || 'No answer generated.';
    } catch {
      throw new BadGatewayException('LLM service unavailable. Please try again.');
    }

    const sources: SourceDto[] = chunks.map((c) => ({
      filename: c.filename,
      chunk: c.text.slice(0, 200),
      score: c.score,
    }));

    return { answer, sources };
  }
}
```

- [ ] **Step 4: Create chat.controller.ts**

```typescript
// apps/backend/src/chat/chat.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { QueryDto } from '../common/dto/query.dto';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('query')
  async query(@Body() dto: QueryDto) {
    return this.chatService.query(dto.question);
  }
}
```

- [ ] **Step 5: Create chat.module.ts**

```typescript
// apps/backend/src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RetrievalModule } from '../retrieval/retrieval.module';

@Module({
  imports: [RetrievalModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest chat.service.spec.ts --no-coverage
```

Expected: PASS — 3 tests pass

- [ ] **Step 7: Commit**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add apps/backend/src/chat/
git commit -m "feat: add chat service with Groq LLM integration and source citations"
```

---

## Task 9: Backend — App Wiring, Health Endpoint, and Bootstrap

**Files:**
- Create: `apps/backend/src/app.module.ts`
- Create: `apps/backend/src/main.ts`

**Interfaces:**
- Consumes: all modules from Tasks 3–8
- Produces: running NestJS server on port 3001 with global prefix `/api` and CORS enabled

- [ ] **Step 1: Create health controller and app.module.ts**

```typescript
// apps/backend/src/app.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

```typescript
// apps/backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { EmbeddingModule } from './embedding/embedding.module';
import { VectorStoreModule } from './vector-store/vector-store.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { RetrievalModule } from './retrieval/retrieval.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    EmbeddingModule,
    VectorStoreModule,
    IngestionModule,
    RetrievalModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
```

- [ ] **Step 2: Create main.ts**

```typescript
// apps/backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: '*' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
```

- [ ] **Step 3: Create nest-cli.json for the backend**

```json
// apps/backend/nest-cli.json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

- [ ] **Step 4: Verify all backend tests pass**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest --no-coverage
```

Expected: All spec files pass. No failures.

- [ ] **Step 5: Start backend and check health**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
cp .env.example .env
# Fill in real API keys in .env before starting
npx nest start
```

Open `http://localhost:3001/api/ingestion/documents` — expect `[]` response.

- [ ] **Step 6: Commit**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add apps/backend/src/app.controller.ts apps/backend/src/app.module.ts apps/backend/src/main.ts apps/backend/nest-cli.json
git commit -m "feat: wire app module, health endpoint, and bootstrap NestJS with CORS and validation"
```

---

## Task 10: Frontend — Next.js Setup and API Client

**Files:**
- Create: `apps/frontend/app/globals.css`
- Create: `apps/frontend/app/layout.tsx`
- Create: `apps/frontend/tailwind.config.ts`
- Create: `apps/frontend/postcss.config.js`
- Create: `apps/frontend/next.config.js`
- Create: `apps/frontend/lib/api.ts`

**Interfaces:**
- Produces:
  - `api.uploadDocument(file: File): Promise<UploadResponse>`
  - `api.listDocuments(): Promise<DocumentMeta[]>`
  - `api.deleteDocument(id: string): Promise<void>`
  - `api.chat(question: string): Promise<ChatResponse>`

- [ ] **Step 1: Create tailwind.config.ts**

```typescript
// apps/frontend/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: Create postcss.config.js**

```javascript
// apps/frontend/postcss.config.js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 3: Create next.config.js**

```javascript
// apps/frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
```

- [ ] **Step 4: Create globals.css**

```css
/* apps/frontend/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Create layout.tsx**

```tsx
// apps/frontend/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NestJS RAG',
  description: 'Document Q&A powered by RAG',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Create lib/api.ts**

```typescript
// apps/frontend/lib/api.ts
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const client = axios.create({ baseURL: BASE_URL });

export interface UploadResponse {
  message: string;
  documentId: string;
  chunks: number;
}

export interface DocumentMeta {
  documentId: string;
  filename: string;
  chunks: number;
  uploadedAt: string;
}

export interface Source {
  filename: string;
  chunk: string;
  score: number;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
}

export const api = {
  uploadDocument: async (file: File): Promise<UploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    const res = await client.post<UploadResponse>('/api/ingestion/upload', form);
    return res.data;
  },

  listDocuments: async (): Promise<DocumentMeta[]> => {
    const res = await client.get<DocumentMeta[]>('/api/ingestion/documents');
    return res.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await client.delete(`/api/ingestion/${id}`);
  },

  chat: async (question: string): Promise<ChatResponse> => {
    const res = await client.post<ChatResponse>('/api/chat/query', { question });
    return res.data;
  },
};
```

- [ ] **Step 7: Commit**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add apps/frontend/
git commit -m "feat: Next.js setup with Tailwind CSS and typed API client"
```

---

## Task 11: Frontend — Components

**Files:**
- Create: `apps/frontend/components/MessageBubble.tsx`
- Create: `apps/frontend/components/ChatWindow.tsx`
- Create: `apps/frontend/components/DocumentUpload.tsx`

**Interfaces:**
- Consumes: `api.uploadDocument()`, `Source` type from `lib/api.ts`
- Produces: React components consumed by `app/page.tsx` (Task 12)

- [ ] **Step 1: Create MessageBubble.tsx**

```tsx
// apps/frontend/components/MessageBubble.tsx
import { Source } from '../lib/api';

interface Props {
  role: 'user' | 'ai';
  content: string;
  sources?: Source[];
}

export default function MessageBubble({ role, content, sources }: Props) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
        isUser ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'
      }`}>
        <p className="whitespace-pre-wrap">{content}</p>
        {sources && sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 mb-1">Sources:</p>
            {sources.map((s, i) => (
              <div key={i} className="text-xs text-gray-500">
                <span className="font-medium">{s.filename}</span>{' '}
                <span className="text-gray-400">(score: {s.score.toFixed(2)})</span>
                <p className="text-gray-400 italic mt-0.5 truncate">{s.chunk}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ChatWindow.tsx**

```tsx
// apps/frontend/components/ChatWindow.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import { api, Source } from '../lib/api';

interface Message {
  role: 'user' | 'ai';
  content: string;
  sources?: Source[];
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.chat(question);
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: res.answer, sources: res.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'Error: Could not get a response. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">
            Upload a document above, then ask a question.
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} sources={m.sources} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-400">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t p-4 flex gap-2">
        <textarea
          className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Ask a question about your document..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create DocumentUpload.tsx**

```tsx
// apps/frontend/components/DocumentUpload.tsx
'use client';
import { useRef, useState } from 'react';
import { api, DocumentMeta } from '../lib/api';

interface Props {
  onUploaded: (doc: DocumentMeta) => void;
}

export default function DocumentUpload({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleUpload = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setStatus('error');
      setMessage('File exceeds 10MB limit');
      return;
    }

    setStatus('uploading');
    setMessage('Uploading and processing...');

    try {
      const res = await api.uploadDocument(file);
      setStatus('success');
      setMessage(`Ingested "${file.name}" — ${res.chunks} chunks stored.`);
      onUploaded({ documentId: res.documentId, filename: file.name, chunks: res.chunks, uploadedAt: new Date().toISOString() });
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.response?.data?.message || 'Upload failed. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Upload Document</h2>
      <div className="flex gap-3 items-center">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-gray-300 file:text-sm file:bg-gray-50 file:cursor-pointer"
        />
        <button
          onClick={handleUpload}
          disabled={status === 'uploading'}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
        >
          {status === 'uploading' ? 'Processing...' : 'Upload'}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-xs ${status === 'error' ? 'text-red-500' : status === 'success' ? 'text-green-600' : 'text-gray-500'}`}>
          {message}
        </p>
      )}
      <p className="mt-1 text-xs text-gray-400">Supported: PDF, TXT, MD, DOCX — max 10MB</p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add apps/frontend/components/
git commit -m "feat: add ChatWindow, MessageBubble, and DocumentUpload components"
```

---

## Task 12: Frontend — Main Page

**Files:**
- Create: `apps/frontend/app/page.tsx`

**Interfaces:**
- Consumes: `DocumentUpload`, `ChatWindow` components, `api.listDocuments()` from `lib/api.ts`
- Produces: fully working single-page RAG UI

- [ ] **Step 1: Create page.tsx**

```tsx
// apps/frontend/app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import DocumentUpload from '../components/DocumentUpload';
import ChatWindow from '../components/ChatWindow';
import { api, DocumentMeta } from '../lib/api';

export default function Home() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);

  useEffect(() => {
    api.listDocuments().then(setDocuments).catch(() => {});
  }, []);

  const handleUploaded = (doc: DocumentMeta) => {
    setDocuments((prev) => [...prev, doc]);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 h-screen flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">NestJS RAG</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload a document and ask questions — answers are grounded in your content.
        </p>
      </div>

      <DocumentUpload onUploaded={handleUploaded} />

      {documents.length > 0 && (
        <div className="text-xs text-gray-500">
          <span className="font-medium">Knowledge base:</span>{' '}
          {documents.map((d) => d.filename).join(', ')}
        </div>
      )}

      <div className="flex-1 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col min-h-0">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Chat</h2>
        </div>
        <ChatWindow />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create frontend .env.local**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/frontend
cp .env.local.example .env.local
```

- [ ] **Step 3: Start frontend and verify UI renders**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/frontend
npm run dev
```

Open `http://localhost:3000` — expect: upload section, chat window, no console errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add apps/frontend/app/
git commit -m "feat: add main page integrating upload and chat UI"
```

---

## Task 13: README and Final Push

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
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
```

- [ ] **Step 2: Run all backend tests one final time**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag/apps/backend
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 3: Final commit and push**

```bash
cd /Users/muhammadtayyab/Github/nestjs-rag
git add README.md
git commit -m "docs: add comprehensive README with setup instructions"
git push origin main
```

Expected: All commits pushed to `https://github.com/Muhammad-Tayyab1/nestjs-rag`
