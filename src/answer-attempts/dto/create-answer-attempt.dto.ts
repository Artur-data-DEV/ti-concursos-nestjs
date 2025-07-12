import {
  IsBoolean,
  IsOptional,
  IsNumber,
  IsDate,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsCUIDv2 } from '../../common/validators/is-cuid-validator';

export class CreateAnswerAttemptDto {
  @IsCUIDv2({ message: 'O ID da resposta deve ser um CUIDv2 válido.' })
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
