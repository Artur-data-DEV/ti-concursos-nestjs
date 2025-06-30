import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnswerAttemptDto } from './answer-attempts.dto';

export type Filters = {
  userId?: string;
  questionId?: string;
  isCorrect?: string;
  limit?: string;
  offset?: string;
};

@Injectable()
export class AnswerAttemptsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: Filters) {
    const where = {
      answer: {
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.questionId ? { questionId: filters.questionId } : {}),
      },
      ...(filters.isCorrect != null && {
        isCorrect: filters.isCorrect === 'true',
      }),
    };

    return this.prisma.answerAttempt.findMany({
      where,
      include: { answer: true },
      take: filters.limit ? parseInt(filters.limit) : undefined,
      skip: filters.offset ? parseInt(filters.offset) : undefined,
      orderBy: { attemptAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.answerAttempt.findUnique({
      where: { id },
      include: { answer: { select: { userId: true } } },
    });
  }

  async findAnswer(answerId: string) {
    return this.prisma.answer.findUnique({
      where: { id: answerId },
      select: { userId: true },
    });
  }

  async create(data: CreateAnswerAttemptDto) {
    return this.prisma.answerAttempt.create({
      data: {
        answerId: data.answerId,
        isCorrect: data.isCorrect,
        timeSpent: data.timeSpent ?? null,
        attemptAt: new Date(),
      },
    });
  }

  async update(id: string, data: Partial<CreateAnswerAttemptDto>) {
    return this.prisma.answerAttempt.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.answerAttempt.delete({ where: { id } });
  }
}
