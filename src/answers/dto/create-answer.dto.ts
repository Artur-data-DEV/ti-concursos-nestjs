import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { IsCUIDv2 } from '../../../src/common/validators/is-cuid-validator';
import { Answer } from '@prisma/client';

export class CreateAnswerDto {
  @IsCUIDv2({ message: 'O ID do usuário deve ser um CUID válido.' })
  userId!: string;

  @IsCUIDv2({ message: 'O ID da pergunta deve ser um CUID válido.' })
  questionId!: string;

  @IsOptional()
  @IsString({ message: 'A opção selecionada deve ser uma string.' })
  @ValidateIf(
    (o: Answer) => o.selectedOption !== null && o.selectedOption !== undefined,
  )
  @IsNotEmpty({ message: 'A opção selecionada não pode ser vazia.' })
  selectedOption?: string;

  @IsOptional()
  @IsString({ message: 'A resposta em texto deve ser uma string.' })
  @ValidateIf(
    (o: Answer) => o.textAnswer !== null && o.textAnswer !== undefined,
  )
  @IsNotEmpty({ message: 'A resposta em texto não pode ser vazia.' })
  textAnswer?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'O campo "isCorrect" deve ser booleano.' })
  isCorrect?: boolean;

  @IsOptional()
  @IsInt({ message: 'O tempo gasto deve ser um número inteiro.' })
  @Min(0, { message: 'O tempo gasto não pode ser negativo.' })
  timeSpentSeconds?: number;
}
