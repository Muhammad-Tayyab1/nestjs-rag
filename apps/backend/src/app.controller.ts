import {Controller, Get} from '@nestjs/common'
import {ApiTags, ApiOperation, ApiResponse} from '@nestjs/swagger'

@ApiTags('Health')
@Controller('api')
export class AppController {
	@Get('health')
	@ApiOperation({summary: 'Health check'})
	@ApiResponse({status: 200, description: 'Service is up', schema: {example: {status: 'ok', timestamp: '2026-06-26T00:00:00.000Z'}}})
	health() {
		return {status: 'ok', timestamp: new Date().toISOString()}
	}
}
