import {Module} from '@nestjs/common'
import {AppController} from './app.controller'
import {EmbeddingModule} from './embedding/embedding.module'
import {VectorStoreModule} from './vector-store/vector-store.module'
import {IngestionModule} from './ingestion/ingestion.module'
import {RetrievalModule} from './retrieval/retrieval.module'
import {ChatModule} from './chat/chat.module'

@Module({
	imports: [EmbeddingModule, VectorStoreModule, IngestionModule, RetrievalModule, ChatModule],
	controllers: [AppController],
	providers: []
})
export class AppModule {}
