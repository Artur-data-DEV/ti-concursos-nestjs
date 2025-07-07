
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'O nome do tópico é obrigatório.' })
  name?: string;
}


