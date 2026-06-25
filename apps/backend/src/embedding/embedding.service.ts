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
