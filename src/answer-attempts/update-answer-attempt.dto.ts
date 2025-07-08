import {
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsUUID,
} from 'class-validator';

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
