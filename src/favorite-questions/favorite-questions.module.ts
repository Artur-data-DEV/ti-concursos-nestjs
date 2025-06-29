import { Module } from '@nestjs/common';
import { FavoriteQuestionsController } from './favorite-questions.controller';
import { FavoriteQuestionsService } from './favorite-questions.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FavoriteQuestionsController],
  providers: [FavoriteQuestionsService]
})
export class FavoriteQuestionsModule {}
