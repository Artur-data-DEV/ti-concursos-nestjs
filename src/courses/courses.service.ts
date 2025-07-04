import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Course } from '@prisma/client';

interface FindAllFilters {
  title?: string;
  instructorId?: string;
  limit?: string;
  offset?: string;
}

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FindAllFilters): Promise<Course[]> {
    const { title, instructorId, limit, offset } = filters;

    const take = limit && !isNaN(Number(limit)) ? parseInt(limit) : undefined;
    const skip =
      offset && !isNaN(Number(offset)) ? parseInt(offset) : undefined;

    return this.prisma.course.findMany({
      where: {
        ...(title && {
          title: {
            contains: title,
            mode: 'insensitive',
          },
        }),
        ...(instructorId && { instructorId }),
      },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
        enrollments: true,
        reviews: true,
      },
      take,
      skip,
    });
  }

  async findOne(
    id: string,
  ): Promise<Pick<Course, 'id' | 'instructorId'> | null> {
    return this.prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        instructorId: true,
      },
    });
  }

  async create(data: Prisma.CourseCreateInput): Promise<Course> {
    return this.prisma.course.create({ data });
  }

  async update(id: string, data: Prisma.CourseUpdateInput): Promise<Course> {
    return this.prisma.course.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<Course> {
    return this.prisma.course.delete({
      where: { id },
    });
  }
}
