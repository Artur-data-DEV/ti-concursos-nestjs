import { PartialType } from '@nestjs/mapped-types';
import { IsUUID, IsDate } from 'class-validator';

export class FavoriteQuestionDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  questionId!: string;

  @IsDate()
  markedAt!: Date;
}

export class UpdateFavoriteQuestionDto extends PartialType(
  FavoriteQuestionDto,
) {}
