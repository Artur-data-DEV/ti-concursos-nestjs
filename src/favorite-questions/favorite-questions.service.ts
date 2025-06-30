import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FavoriteQuestionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.FavoriteQuestionCreateInput) {
    return this.prisma.favoriteQuestion.create({ data });
  }

  async findAll() {
    return this.prisma.favoriteQuestion.findMany();
  }

  async findManyByUserId(userId: string) {
    return this.prisma.favoriteQuestion.findMany({
      where: { userId: userId },
    });
  }

  async findOne(userId_questionId: Prisma.FavoriteQuestionWhereUniqueInput) {
    return this.prisma.favoriteQuestion.findUnique({
      where: userId_questionId,
    });
  }

  async update(
    userId_questionId: Prisma.FavoriteQuestionWhereUniqueInput,
    data: Prisma.FavoriteQuestionUpdateInput,
  ) {
    return this.prisma.favoriteQuestion.update({
      where: userId_questionId,
      data,
    });
  }

  async remove(userId_questionId: Prisma.FavoriteQuestionWhereUniqueInput) {
    return this.prisma.favoriteQuestion.delete({ where: userId_questionId });
  }
}
