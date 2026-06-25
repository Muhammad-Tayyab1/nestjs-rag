// apps/backend/src/chat/chat.controller.ts
import {Controller, Post, Body} from '@nestjs/common'
import {ChatService} from './chat.service'
import {QueryDto} from '../common/dto/query.dto'

@Controller('api/chat')
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	@Post('query')
	async query(@Body() dto: QueryDto) {
		return this.chatService.query(dto.question)
	}
}
