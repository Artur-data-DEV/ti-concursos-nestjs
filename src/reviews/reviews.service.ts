import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.CourseReviewCreateInput) {
    return this.prisma.courseReview.create({ data });
  }

  async findAll() {
    return this.prisma.courseReview.findMany();
  }

  async findManyByUserId(userId: string) {
    return this.prisma.courseReview.findMany({
      where: { userId: userId },
    });
  }

  async findOne(id: string) {
    return this.prisma.courseReview.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.CourseReviewUpdateInput) {
    return this.prisma.courseReview.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.courseReview.delete({ where: { id } });
  }
}


