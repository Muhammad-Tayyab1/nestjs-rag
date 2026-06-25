// apps/backend/src/vector-store/vector-store.service.ts
import {Injectable, BadGatewayException} from '@nestjs/common'
import {Pinecone} from '@pinecone-database/pinecone'

export interface VectorRecord {
	id: string
	values: number[]
	metadata: {
		filename: string
		documentId: string
		chunkIndex: number
		uploadedAt: string
		text: string
	}
}

export interface SearchResult {
	filename: string
	documentId: string
	text: string
	score: number
}

export interface DocumentMeta {
	documentId: string
	filename: string
	chunks: number
	uploadedAt: string
}

@Injectable()
export class VectorStoreService {
	private readonly pinecone: Pinecone
	private readonly indexName: string
	private readonly documentRegistry: Map<string, DocumentMeta> = new Map()

	constructor() {
		this.pinecone = new Pinecone({apiKey: process.env.PINECONE_API_KEY})
		this.indexName = process.env.PINECONE_INDEX_NAME || 'nestjs-rag'
	}

	private get index() {
		return this.pinecone.index(this.indexName)
	}

	async upsert(vectors: VectorRecord[]): Promise<void> {
		try {
			await this.index.upsert(vectors)
		} catch {
			throw new BadGatewayException('Vector store unavailable. Please try again.')
		}
	}

	async similaritySearch(vector: number[], topK: number): Promise<SearchResult[]> {
		try {
			const result = await this.index.query({
				vector,
				topK,
				includeMetadata: true
			})
			return (result.matches || []).map((match) => ({
				filename: (match.metadata as any).filename,
				documentId: (match.metadata as any).documentId,
				text: (match.metadata as any).text,
				score: match.score || 0
			}))
		} catch {
			throw new BadGatewayException('Vector store unavailable. Please try again.')
		}
	}

	async deleteByDocumentId(documentId: string): Promise<void> {
		try {
			// Use filter-based delete — more robust than reconstructed IDs
			await (this.index as any).deleteMany({filter: {documentId: {$eq: documentId}}})
		} catch {
			throw new BadGatewayException('Vector store unavailable. Please try again.')
		}
	}

	registerDocument(meta: DocumentMeta): void {
		this.documentRegistry.set(meta.documentId, meta)
	}

	removeDocument(documentId: string): void {
		this.documentRegistry.delete(documentId)
	}

	listDocuments(): DocumentMeta[] {
		return Array.from(this.documentRegistry.values())
	}
}
