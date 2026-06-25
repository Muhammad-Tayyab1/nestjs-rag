import { IsString, IsNotEmpty } from 'class-validator';

export class QueryDto {
  @IsString()
  @IsNotEmpty({ message: 'Question cannot be empty' })
  question: string;
}
