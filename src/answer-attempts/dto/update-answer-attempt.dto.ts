import { IsBoolean, IsDate, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAnswerAttemptDto {
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  timeSpent?: number | null;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  attemptAt?: Date;
}
