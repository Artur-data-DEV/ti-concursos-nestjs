import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AttemptFilterDto,
  CreateAnswerAttemptDto,
} from './answer-attempts.dto';

@Injectable()
export class AnswerAttemptsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: AttemptFilterDto) {
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
      take: filters.limit,
      skip: filters.offset,
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
