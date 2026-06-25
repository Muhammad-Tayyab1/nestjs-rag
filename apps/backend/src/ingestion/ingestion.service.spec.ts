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
