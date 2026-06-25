import {Injectable} from '@nestjs/common'
import {EmbeddingService} from '../embedding/embedding.service'
import {VectorStoreService, SearchResult} from '../vector-store/vector-store.service'

const TOP_K = 5

@Injectable()
export class RetrievalService {
	constructor(
		private readonly embeddingService: EmbeddingService,
		private readonly vectorStoreService: VectorStoreService
	) {}

	async retrieve(question: string): Promise<SearchResult[]> {
		const vector = await this.embeddingService.embed(question)
		return this.vectorStoreService.similaritySearch(vector, TOP_K)
	}
}
