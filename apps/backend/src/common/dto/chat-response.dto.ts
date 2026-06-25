export class SourceDto {
	filename: string
	chunk: string
	score: number
}

export class ChatResponseDto {
	answer: string
	sources: SourceDto[]
}
