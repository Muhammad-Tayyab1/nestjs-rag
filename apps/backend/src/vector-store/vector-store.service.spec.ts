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
