import {ApiProperty} from '@nestjs/swagger'

export class SourceDto {
	@ApiProperty({example: 'report.pdf'})
	filename: string

	@ApiProperty({example: 'The quarterly revenue grew by 12%...'})
	chunk: string

	@ApiProperty({example: 0.91})
	score: number
}

export class ChatResponseDto {
	@ApiProperty({example: 'The document discusses quarterly revenue growth.'})
	answer: string

	@ApiProperty({type: [SourceDto]})
	sources: SourceDto[]
}
