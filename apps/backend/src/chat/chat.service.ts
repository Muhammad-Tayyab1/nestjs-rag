// apps/backend/src/chat/chat.service.ts
import {Injectable, BadRequestException, BadGatewayException} from '@nestjs/common'
import Groq from 'groq-sdk'
import {RetrievalService} from '../retrieval/retrieval.service'
import {ChatResponseDto, SourceDto} from '../common/dto/chat-response.dto'

@Injectable()
export class ChatService {
	private readonly groq: Groq

	constructor(private readonly retrievalService: RetrievalService) {
		this.groq = new Groq({apiKey: process.env.GROQ_API_KEY})
	}

	async query(question: string): Promise<ChatResponseDto> {
		if (!question || !question.trim()) {
			throw new BadRequestException('Question cannot be empty')
		}

		const chunks = await this.retrievalService.retrieve(question)
		const context = chunks.map((c) => c.text).join('\n\n')

		let answer: string
		try {
			const completion = await this.groq.chat.completions.create({
				model: 'llama-3.3-70b-versatile',
				messages: [
					{
						role: 'system',
						content: 'You are a helpful assistant. Answer the user question using ONLY the context provided. If the answer is not in the context, say "I could not find the answer in the uploaded documents."'
					},
					{
						role: 'user',
						content: `Context:\n${context}\n\nQuestion: ${question}`
					}
				]
			})
			answer = completion.choices[0]?.message?.content || 'No answer generated.'
		} catch {
			throw new BadGatewayException('LLM service unavailable. Please try again.')
		}

		const sources: SourceDto[] = chunks.map((c) => ({
			filename: c.filename,
			chunk: c.text.slice(0, 200),
			score: c.score
		}))

		return {answer, sources}
	}
}
