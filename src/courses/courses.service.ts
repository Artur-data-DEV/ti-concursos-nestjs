import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: any) {
    return this.prisma.course.findMany({
      where: {
        ...(filters.title && {
          title: { contains: filters.title, mode: 'insensitive' },
        }),
        ...(filters.instructorId && { instructorId: filters.instructorId }),
      },
      include: {
        modules: { include: { lessons: true } },
        enrollments: true,
        reviews: true,
      },
      take: filters.limit ? parseInt(filters.limit) : undefined,
      skip: filters.offset ? parseInt(filters.offset) : undefined,
    });
  }

  async findOne(id: string) {
    return this.prisma.course.findUnique({
      where: { id },
      select: { instructorId: true, id: true },
    });
  }

  async create(data: any) {
    return this.prisma.course.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.course.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.course.delete({
      where: { id },
    });
  }
}

