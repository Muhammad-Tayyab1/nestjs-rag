import {IsString, IsNotEmpty} from 'class-validator'
import {ApiProperty} from '@nestjs/swagger'

export class QueryDto {
	@ApiProperty({example: 'What is the main topic of this document?'})
	@IsString()
	@IsNotEmpty({message: 'Question cannot be empty'})
	question: string
}
