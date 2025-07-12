import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { IsCUIDv2 } from '../../common/validators/is-cuid-validator';

export class AttemptFilterDto {
  @IsOptional()
  @IsCUIDv2()
  userId?: string;

  @IsOptional()
  @IsCUIDv2()
  questionId?: string;

  @IsBoolean()
  isCorrect!: boolean;

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
export class FindAttemptFilterDto {
  @IsOptional()
  @IsCUIDv2()
  userId?: string;

  @IsOptional()
  @IsCUIDv2()
  questionId?: string;

  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

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
