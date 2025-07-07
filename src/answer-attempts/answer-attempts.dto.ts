import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsNumber,
  IsDate,
  IsUUID,
  Min,
  ValidateIf,
  IsBooleanString,
  IsInt,
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

export class UpdateAnswerAttemptDto {
  @IsUUID('4', { message: 'O ID da tentativa deve ser um UUID válido.' })
  id!: string;

  @IsUUID('4')
  answerId!: string;

  @IsBoolean()
  isCorrect!: boolean;

  @IsOptional()
  @IsNumber()
  timeSpent?: number | null;

  @IsOptional()
  @IsDate()
  attemptAt?: Date;
}

// src/answer-attempts/dto/attempt-filter.dto.ts
export class AttemptFilterDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  questionId?: string;

  @IsOptional()
  @IsBooleanString()
  isCorrect?: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsInt()
  @Min(0)
  limit?: number;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsInt()
  @Min(0)
  offset?: number;
}
