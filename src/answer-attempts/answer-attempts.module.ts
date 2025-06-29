import { Module } from '@nestjs/common';
import { AnswerAttemptsController } from './answer-attempts.controller';
import { AnswerAttemptsService } from './answer-attempts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnswerAttemptsController],
  providers: [AnswerAttemptsService]
})
export class AnswerAttemptsModule {}
