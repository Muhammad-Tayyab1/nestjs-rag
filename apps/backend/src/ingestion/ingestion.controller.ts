import {Controller, Post, Get, Delete, Param, UploadedFile, UseInterceptors, HttpCode, HttpStatus} from '@nestjs/common'
import {FileInterceptor} from '@nestjs/platform-express'
import {ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiParam} from '@nestjs/swagger'
import {IngestionService} from './ingestion.service'
import {UploadResponseDto} from '../common/dto/upload-response.dto'

const TEN_MB = 10 * 1024 * 1024

@ApiTags('Ingestion')
@Controller('api/ingestion')
export class IngestionController {
	constructor(private readonly ingestionService: IngestionService) {}

	@Post('upload')
	@HttpCode(HttpStatus.CREATED)
	@UseInterceptors(FileInterceptor('file', {limits: {fileSize: TEN_MB}}))
	@ApiOperation({summary: 'Upload and ingest a document'})
	@ApiConsumes('multipart/form-data')
	@ApiBody({schema: {type: 'object', properties: {file: {type: 'string', format: 'binary'}}}})
	@ApiResponse({status: 201, description: 'Document ingested', type: UploadResponseDto})
	@ApiResponse({status: 400, description: 'Unsupported file type'})
	@ApiResponse({status: 413, description: 'File exceeds 10MB limit'})
	@ApiResponse({status: 502, description: 'Embedding service unavailable'})
	async upload(@UploadedFile() file: Express.Multer.File) {
		return this.ingestionService.ingest(file)
	}

	@Get('documents')
	@ApiOperation({summary: 'List all ingested documents'})
	@ApiResponse({status: 200, description: 'List of documents'})
	list() {
		return this.ingestionService.list()
	}

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({summary: 'Delete a document and its vectors'})
	@ApiParam({name: 'id', description: 'Document ID returned from upload'})
	@ApiResponse({status: 204, description: 'Document deleted'})
	@ApiResponse({status: 404, description: 'Document not found'})
	async delete(@Param('id') id: string) {
		await this.ingestionService.delete(id)
	}
}
