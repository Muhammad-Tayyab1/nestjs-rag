// apps/backend/src/ingestion/ingestion.controller.ts
import {Controller, Post, Get, Delete, Param, UploadedFile, UseInterceptors, HttpCode, HttpStatus} from '@nestjs/common'
import {FileInterceptor} from '@nestjs/platform-express'
import {IngestionService} from './ingestion.service'

@Controller('api/ingestion')
export class IngestionController {
	constructor(private readonly ingestionService: IngestionService) {}

	@Post('upload')
	@HttpCode(HttpStatus.CREATED)
	@UseInterceptors(FileInterceptor('file'))
	async upload(@UploadedFile() file: Express.Multer.File) {
		return this.ingestionService.ingest(file)
	}

	@Get('documents')
	list() {
		return this.ingestionService.list()
	}

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async delete(@Param('id') id: string) {
		await this.ingestionService.delete(id)
	}
}
