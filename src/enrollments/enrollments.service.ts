import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class EnrollmentsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.EnrollmentCreateInput) {
    return this.prisma.enrollment.create({ data });
  }

  async findAll() {
    return this.prisma.enrollment.findMany();
  }

  async findManyByUserId(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId: userId },
    });
  }

  async findOne(id: string) {
    return this.prisma.enrollment.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.EnrollmentUpdateInput) {
    return this.prisma.enrollment.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.enrollment.delete({ where: { id } });
  }
}


