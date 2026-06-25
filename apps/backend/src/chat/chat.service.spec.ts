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
