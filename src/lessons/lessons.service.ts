import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonsFilterDto } from './dto/lessons-filter-dto';
import { ValidateUuidDto } from './dto/validate-uuid.dto';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLessonDto) {
    return this.prisma.lesson.create({
      data: {
        title: dto.title,
        content: dto.content,
        lessonType: dto.lessonType,
        videoUrl: dto.videoUrl,
        duration: dto.duration,
        order: dto.order,
        module: { connect: { id: dto.moduleId } }, // RELAÇÃO
      },
    });
  }

  async findAll(filters: LessonsFilterDto) {
    const { take, skip } = filters;

    return this.prisma.lesson.findMany({
      take,
      skip,
    });
  }

  async findOne(id: string) {
    return this.prisma.lesson.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateLessonDto) {
    return this.prisma.lesson.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.lesson.delete({ where: { id } });
  }

  async isTeacherOwnerOfModule(dto: ValidateUuidDto): Promise<boolean> {
    const { moduleId, teacherId } = dto;

    const foundModule = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        course: {
          select: {
            instructorId: true,
          },
        },
      },
    });

    if (!foundModule?.course) return false;

    return foundModule.course.instructorId === teacherId;
  }

  async studentHasAccessToLesson(studentId: string, moduleId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { courseId: true },
    });

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: studentId,
        courseId: module?.courseId,
        status: 'ACTIVE',
      },
    });
    return !!enrollment;
  }

  async findAvailableLessonsForStudent(studentId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { userId: studentId, courseId, status: 'ACTIVE' },
    });

    if (!enrollment) return [];

    return this.prisma.lesson.findMany({
      where: { module: { courseId } },
      orderBy: { order: 'asc' },
    });
  }

  async findExistentModule(moduleId: string) {
    return this.prisma.module.findUnique({ where: { id: moduleId } });
  }
}
