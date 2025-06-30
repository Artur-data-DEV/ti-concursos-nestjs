import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.UserProgressCreateInput) {
    return this.prisma.userProgress.create({ data });
  }

  async findAll() {
    return this.prisma.userProgress.findMany();
  }

  async findManyByUserId(userId: string) {
    return this.prisma.userProgress.findMany({
      where: { userId: userId },
    });
  }

  async findOne(id: string) {
    return this.prisma.userProgress.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.UserProgressUpdateInput) {
    return this.prisma.userProgress.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.userProgress.delete({ where: { id } });
  }
}
