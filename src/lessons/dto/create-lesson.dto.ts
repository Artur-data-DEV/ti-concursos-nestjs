import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUrl,
  IsInt,
  Min,
} from 'class-validator';
import { LessonType } from '@prisma/client';
import { IsCUIDv2 } from '../../../src/common/validators/is-cuid-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsEnum(LessonType, {
    message: `lessonType deve ser um dos valores: ${Object.values(LessonType).join(', ')}`,
  })
  lessonType!: LessonType;

  @IsOptional()
  @IsUrl({}, { message: 'URL do vídeo inválida.' })
  videoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0, {
    message: 'A duração deve ser um número inteiro positivo (em segundos).',
  })
  duration?: number;

  @IsCUIDv2()
  moduleId!: string;

  @IsInt()
  @Min(0, { message: 'A ordem deve ser um número inteiro positivo.' })
  order!: number;
}
