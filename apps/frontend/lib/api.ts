import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const client = axios.create({baseURL: BASE_URL})

export interface UploadResponse {
	message: string
	documentId: string
	chunks: number
}

export interface DocumentMeta {
	documentId: string
	filename: string
	chunks: number
	uploadedAt: string
}

export interface Source {
	filename: string
	chunk: string
	score: number
}

export interface ChatResponse {
	answer: string
	sources: Source[]
}

export const api = {
	uploadDocument: async (file: File): Promise<UploadResponse> => {
		const form = new FormData()
		form.append('file', file)
		const res = await client.post<UploadResponse>('/api/ingestion/upload', form)
		return res.data
	},

	listDocuments: async (): Promise<DocumentMeta[]> => {
		const res = await client.get<DocumentMeta[]>('/api/ingestion/documents')
		return res.data
	},

	deleteDocument: async (id: string): Promise<void> => {
		await client.delete(`/api/ingestion/${id}`)
	},

	chat: async (question: string): Promise<ChatResponse> => {
		const res = await client.post<ChatResponse>('/api/chat/query', {question})
		return res.data
	}
}
