import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnswerDto } from './dto/create-answer.dto';

@Injectable()
export class AnswersService {
  constructor(private prisma: PrismaService) {}
  async findOne(id: string) {
    return this.prisma.answer.findUnique({ where: { id } });
  }

  async create(data: CreateAnswerDto) {
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
