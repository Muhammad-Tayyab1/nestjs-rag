// apps/backend/src/ingestion/ingestion.service.ts
import {Injectable, BadRequestException, NotFoundException} from '@nestjs/common'
import {v4 as uuidv4} from 'uuid'
import {EmbeddingService} from '../embedding/embedding.service'
import {VectorStoreService, DocumentMeta} from '../vector-store/vector-store.service'
import {UploadResponseDto} from '../common/dto/upload-response.dto'
import {parsePdf} from './parsers/pdf.parser'
import {parseTxt} from './parsers/txt.parser'
import {parseMd} from './parsers/md.parser'
import {parseDocx} from './parsers/docx.parser'

const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.md', '.docx']
const CHUNK_SIZE = 2000
const CHUNK_OVERLAP = 200

@Injectable()
export class IngestionService {
	constructor(
		private readonly embeddingService: EmbeddingService,
		private readonly vectorStoreService: VectorStoreService
	) {}

	async ingest(file: Express.Multer.File): Promise<UploadResponseDto> {
		const ext = this.getExtension(file.originalname)
		if (!SUPPORTED_EXTENSIONS.includes(ext)) {
			throw new BadRequestException('Unsupported file type. Use PDF, TXT, MD, or DOCX')
		}

		const text = await this.parseFile(file.buffer, ext)
		const chunks = this.chunkText(text)
		const documentId = uuidv4()
		const uploadedAt = new Date().toISOString()

		const embeddings = await this.embeddingService.embedBatch(chunks)

		const vectors = chunks.map((chunk, i) => ({
			id: `${documentId}-${i}`,
			values: embeddings[i],
			metadata: {
				filename: file.originalname,
				documentId,
				chunkIndex: i,
				uploadedAt,
				text: chunk
			}
		}))

		await this.vectorStoreService.upsert(vectors)
		this.vectorStoreService.registerDocument({
			documentId,
			filename: file.originalname,
			chunks: chunks.length,
			uploadedAt
		})

		return {message: 'Document ingested successfully', documentId, chunks: chunks.length}
	}

	list(): DocumentMeta[] {
		return this.vectorStoreService.listDocuments()
	}

	async delete(documentId: string): Promise<void> {
		const docs = this.vectorStoreService.listDocuments()
		const doc = docs.find((d) => d.documentId === documentId)
		if (!doc) throw new NotFoundException(`Document ${documentId} not found`)

		await this.vectorStoreService.deleteByDocumentId(documentId)
		this.vectorStoreService.removeDocument(documentId)
	}

	private getExtension(filename: string): string {
		return filename.slice(filename.lastIndexOf('.')).toLowerCase()
	}

	private async parseFile(buffer: Buffer, ext: string): Promise<string> {
		switch (ext) {
			case '.pdf':
				return parsePdf(buffer)
			case '.txt':
				return parseTxt(buffer)
			case '.md':
				return parseMd(buffer)
			case '.docx':
				return parseDocx(buffer)
			default:
				throw new BadRequestException('Unsupported file type. Use PDF, TXT, MD, or DOCX')
		}
	}

	private chunkText(text: string): string[] {
		const chunks: string[] = []
		let start = 0
		while (start < text.length) {
			chunks.push(text.slice(start, start + CHUNK_SIZE))
			start += CHUNK_SIZE - CHUNK_OVERLAP
		}
		return chunks.filter((c) => c.trim().length > 0)
	}
}
