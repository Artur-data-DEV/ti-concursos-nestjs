import { Transform } from 'class-transformer';
import {
  IsBooleanString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

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
