import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateTopicDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'O nome do tópico é obrigatório.' })
  name!: string;
}
