import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsOptional,
  IsUrl,
  IsUUID,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @IsString({ message: 'O título é obrigatório.' })
  title!: string;

  @IsString({ message: 'A descrição é obrigatória.' })
  description!: string;

  @IsUUID('4', { message: 'O ID do instrutor deve ser um UUID válido.' })
  instructorId!: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL da thumbnail inválida.' })
  thumbnail?: string | null;

  @IsOptional()
  @IsNumber({}, { message: 'O preço deve ser um número.' })
  @Min(0, { message: 'O preço deve ser um número positivo.' })
  price?: number | null;

  @IsOptional()
  @IsBoolean({ message: 'O campo "isPublished" deve ser um booleano.' })
  isPublished?: boolean;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
