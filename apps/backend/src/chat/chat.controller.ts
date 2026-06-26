import {Controller, Post, Body} from '@nestjs/common'
import {ApiTags, ApiOperation, ApiResponse} from '@nestjs/swagger'
import {ChatService} from './chat.service'
import {QueryDto} from '../common/dto/query.dto'
import {ChatResponseDto} from '../common/dto/chat-response.dto'

@ApiTags('Chat')
@Controller('api/chat')
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	@Post('query')
	@ApiOperation({summary: 'Ask a question grounded in uploaded documents'})
	@ApiResponse({status: 200, description: 'AI answer with sources', type: ChatResponseDto})
	@ApiResponse({status: 400, description: 'Empty or invalid question'})
	@ApiResponse({status: 502, description: 'LLM or retrieval service unavailable'})
	async query(@Body() dto: QueryDto) {
		return this.chatService.query(dto.question)
	}
}
