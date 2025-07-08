import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';

export class CreateAnswerDto {
  @IsUUID('4', { message: 'O ID do usuário deve ser um UUID válido.' })
  userId!: string;

  @IsUUID('4', { message: 'O ID da pergunta deve ser um UUID válido.' })
  questionId!: string;

  @IsOptional()
  @IsString({ message: 'A opção selecionada deve ser uma string.' })
  @IsNotEmpty({ message: 'A opção selecionada não pode ser uma string vazia.' })
  selectedOption?: string;

  @IsOptional()
  @IsString({ message: 'A resposta em texto deve ser uma string.' })
  @ValidateIf((o: CreateAnswerDto) => o.textAnswer !== null)
  textAnswer?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'O campo "isCorrect" deve ser booleano.' })
  isCorrect?: boolean;

  @IsOptional()
  @IsInt({ message: 'O tempo gasto deve ser um número inteiro.' })
  @Min(0, { message: 'O tempo gasto não pode ser negativo.' })
  timeSpentSeconds?: number;
}
