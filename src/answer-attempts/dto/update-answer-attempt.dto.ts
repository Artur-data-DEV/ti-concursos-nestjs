import { IsBoolean, IsDate, IsNumber, IsOptional } from 'class-validator';
import { IsCUIDv2 } from '../../common/validators/is-cuid-validator';

export class UpdateAnswerAttemptDto {
  @IsCUIDv2({ message: 'O ID da tentativa deve ser um CUIDv2 válido.' })
  id!: string;

  @IsCUIDv2({ message: 'O ID da resposta deve ser um CUIDv2 válido.' })
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
