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
