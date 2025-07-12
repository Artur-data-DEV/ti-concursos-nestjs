import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnswerAttemptDto } from './dto/create-answer-attempt.dto';
import { UpdateAnswerAttemptDto } from './dto/update-answer-attempt.dto';
import { FindAttemptFilterDto } from './dto/answer-attempts-filters.dto';

@Injectable()
export class AnswerAttemptsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FindAttemptFilterDto) {
    const where = {
      answer: {
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.questionId ? { questionId: filters.questionId } : {}),
      },
      ...(filters.isCorrect !== undefined && {
        isCorrect: filters.isCorrect,
      }),
    };

    return this.prisma.answerAttempt.findMany({
      where,
      include: { answer: true },
      orderBy: { attemptAt: 'desc' },
      ...(filters.limit ? { take: Number(filters.limit) } : {}),
      ...(filters.offset ? { skip: Number(filters.offset) } : {}),
    });
  }

  async findOne(id: string) {
    return this.prisma.answerAttempt.findUnique({
      where: { id },
      include: { answer: true },
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
      include: { answer: true },
    });
  }

  async update(id: string, data: UpdateAnswerAttemptDto) {
    return this.prisma.answerAttempt.update({
      where: { id },
      data: {
        isCorrect: data.isCorrect,
        timeSpent: data.timeSpent ?? null,
        attemptAt: data.attemptAt || new Date(),
      },
      include: { answer: true },
    });
  }

  async remove(id: string) {
    return this.prisma.answerAttempt.delete({
      where: { id },
    });
  }
}
