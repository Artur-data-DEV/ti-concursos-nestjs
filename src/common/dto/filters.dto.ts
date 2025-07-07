import { IsOptional, IsUUID, IsInt, Min } from 'class-validator';

export class FindQuestionsFiltersDto {
  @IsOptional()
  @IsUUID('4') // Garante que o userId seja um UUID válido
  userId?: string;

  @IsOptional()
  @IsUUID('4') // Garante que o questionId seja um UUID válido
  questionId?: string;

  @IsOptional()
  @IsInt() // Garante que o limit seja um número inteiro
  @Min(1) // Garante que o limit seja maior ou igual a 1
  limit?: number;

  @IsOptional()
  @IsInt() // Garante que o offset seja um número inteiro
  @Min(0) // Garante que o offset seja maior ou igual a 0
  offset?: number;
}
