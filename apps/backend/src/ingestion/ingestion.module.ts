// apps/backend/src/ingestion/ingestion.module.ts
import { Module } from '@nestjs/common';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { VectorStoreModule } from '../vector-store/vector-store.module';

@Module({
  imports: [EmbeddingModule, VectorStoreModule],
  controllers: [IngestionController],
  providers: [IngestionService],
})
export class IngestionModule {}
