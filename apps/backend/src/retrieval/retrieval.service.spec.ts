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
