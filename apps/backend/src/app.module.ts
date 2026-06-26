import {Module} from '@nestjs/common'
import {ThrottlerModule, ThrottlerGuard} from '@nestjs/throttler'
import {APP_GUARD} from '@nestjs/core'
import {AppController} from './app.controller'
import {EmbeddingModule} from './embedding/embedding.module'
import {VectorStoreModule} from './vector-store/vector-store.module'
import {IngestionModule} from './ingestion/ingestion.module'
import {RetrievalModule} from './retrieval/retrieval.module'
import {ChatModule} from './chat/chat.module'

@Module({
	imports: [
		ThrottlerModule.forRoot([{ttl: 60000, limit: 30}]),
		EmbeddingModule,
		VectorStoreModule,
		IngestionModule,
		RetrievalModule,
		ChatModule,
	],
	controllers: [AppController],
	providers: [{provide: APP_GUARD, useClass: ThrottlerGuard}],
})
export class AppModule {}
