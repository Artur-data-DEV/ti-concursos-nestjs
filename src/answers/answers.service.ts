import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnswersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.answer.create({
      data: {
        userId: data.userId,
        questionId: data.questionId,
        selectedOption: data.selectedOption,
        textAnswer: data.textAnswer,
        isCorrect: data.isCorrect,
        timeSpentSeconds: data.timeSpentSeconds,
      },
    });
  }
}

