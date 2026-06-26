import {ApiProperty} from '@nestjs/swagger'

export class UploadResponseDto {
	@ApiProperty({example: 'Document ingested successfully'})
	message: string

	@ApiProperty({example: 'a1b2c3d4-...'})
	documentId: string

	@ApiProperty({example: 12})
	chunks: number
}
