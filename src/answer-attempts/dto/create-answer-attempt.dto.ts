import {
  IsBoolean,
  IsOptional,
  IsNumber,
  IsDate,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateAnswerAttemptDto {
  @IsUUID('4', { message: 'O ID da resposta deve ser um UUID válido.' })
  answerId!: string;

  @IsBoolean({ message: 'O campo "isCorrect" deve ser booleano.' })
  isCorrect!: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'O tempo gasto deve ser um número.' })
  @Min(0, { message: 'O tempo gasto não pode ser negativo.' })
  @ValidateIf((o: CreateAnswerAttemptDto) => o.timeSpent !== null)
  timeSpent?: number | null;

  @IsOptional()
  @IsDate({ message: 'A data da tentativa deve ser uma data válida.' })
  attemptAt?: Date;
}
