// apps/backend/src/chat/chat.module.ts
import {Module} from '@nestjs/common'
import {ChatController} from './chat.controller'
import {ChatService} from './chat.service'
import {RetrievalModule} from '../retrieval/retrieval.module'

@Module({
	imports: [RetrievalModule],
	controllers: [ChatController],
	providers: [ChatService]
})
export class ChatModule {}
