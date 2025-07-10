import { EnrollmentStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Title não pode ser vazio.' })
  @Length(4, 255, { message: 'Title deve ter no mínimo 4 caracteres.' })
  title?: string;

  @IsOptional()
  @IsInt({ message: 'Duração deve ser um número inteiro.' })
  @Min(1, { message: 'A duração deve ser maior que 0.' })
  duration?: number;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
