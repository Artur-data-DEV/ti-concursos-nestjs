import {
  IsString,
  IsOptional,
  IsUrl,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { IsCUIDv2 } from '../../common/validators/is-cuid-validator';

export class CreateCourseDto {
  @IsString({ message: 'O título é obrigatório.' })
  title!: string;

  @IsString({ message: 'A descrição é obrigatória.' })
  description!: string;

  @IsCUIDv2({ message: 'O ID do instrutor do curso deve ser um CUID válido.' })
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
