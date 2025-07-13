/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { LessonsService } from './lessons.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { LessonType, Prisma } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

type ModuleWithCourse = Prisma.ModuleGetPayload<{
  include: {
    course: {
      select: {
        instructorId: true;
      };
    };
  };
}>;

describe('LessonsService', () => {
  let service: LessonsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a lesson', async () => {
      const dto: CreateLessonDto = {
        title: 'Test Lesson',
        content: 'Lesson Content',
        lessonType: LessonType.QUIZ,
        videoUrl: 'http://video.url',
        duration: 120,
        order: 1,
        moduleId: 'module-uuid',
      };

      const createdLesson = {
        id: 'lessoncuid',
        title: dto.title,
        content: dto.content,
        lessonType: dto.lessonType,
        videoUrl: dto.videoUrl ?? null,
        duration: dto.duration ?? null,
        order: dto.order,
        moduleId: dto.moduleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.lesson.create.mockResolvedValue(createdLesson);

      const result = await service.create(dto);

      expect(prisma.lesson.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          content: dto.content,
          lessonType: dto.lessonType,
          videoUrl: dto.videoUrl ?? null,
          duration: dto.duration ?? null,
          order: dto.order,
          module: { connect: { id: dto.moduleId } },
        },
      });

      expect(result).toEqual(createdLesson);
    });
  });

  describe('findAll', () => {
    it('should return lessons with pagination', async () => {
      const filters = { take: 10, skip: 0 };
      const lessons = [
        {
          id: '1',
          title: 'Lesson 1',
          content: 'Content 1',
          lessonType: LessonType.EXERCISE,
          videoUrl: null,
          duration: null,
          moduleId: 'module-1',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          title: 'Lesson 2',
          content: 'Content 2',
          lessonType: LessonType.QUIZ,
          videoUrl: 'http://video.url',
          duration: 60,
          moduleId: 'module-1',
          order: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prisma.lesson.findMany.mockResolvedValue(lessons);

      const result = await service.findAll(filters);

      expect(prisma.lesson.findMany).toHaveBeenCalledWith({
        take: filters.take,
        skip: filters.skip,
      });
      expect(result).toEqual(lessons);
    });
  });

  describe('findOne', () => {
    it('should find one lesson by id', async () => {
      const lesson = {
        id: 'lessoncuid',
        title: 'Lesson Title',
        content: 'Lesson Content',
        lessonType: LessonType.EXERCISE,
        videoUrl: null,
        duration: null,
        moduleId: 'module-uuid',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.lesson.findUnique.mockResolvedValue(lesson);

      const result = await service.findOne('lessoncuid');

      expect(prisma.lesson.findUnique).toHaveBeenCalledWith({
        where: { id: 'lessoncuid' },
      });
      expect(result).toEqual(lesson);
    });
  });

  describe('update', () => {
    it('should update a lesson', async () => {
      const updateDto = { title: 'Updated Title' };

      const updatedLesson = {
        id: 'lessoncuid',
        title: updateDto.title,
        content: 'Old Content',
        lessonType: LessonType.QUIZ,
        videoUrl: null,
        duration: null,
        moduleId: 'module-uuid',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.lesson.update.mockResolvedValue(updatedLesson);

      const result = await service.update('lessoncuid', updateDto);

      expect(prisma.lesson.update).toHaveBeenCalledWith({
        where: { id: 'lessoncuid' },
        data: updateDto,
      });
      expect(result).toEqual(updatedLesson);
    });
  });

  describe('remove', () => {
    it('should delete a lesson', async () => {
      const deletedLesson = {
        id: 'lessoncuid',
        title: 'Lesson Title',
        content: 'Content',
        lessonType: LessonType.EXERCISE,
        videoUrl: null,
        duration: null,
        moduleId: 'module-uuid',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.lesson.delete.mockResolvedValue(deletedLesson);

      const result = await service.remove('lessoncuid');

      expect(prisma.lesson.delete).toHaveBeenCalledWith({
        where: { id: 'lessoncuid' },
      });
      expect(result).toEqual(deletedLesson);
    });
  });

  describe('isTeacherOwnerOfModule', () => {
    it('should return false if module does not exist', async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      const result = await service.isTeacherOwnerOfModule({
        teacherId: 'teacher-id',
        moduleId: 'nonexistent-module-id',
      });

      expect(result).toBe(false);
    });

    it('should return false if teacher does not own the module', async () => {
      const mockModule: ModuleWithCourse = {
        id: 'module-id',
        title: 'Some Module',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        courseId: 'course-id',
        course: {
          instructorId: 'another-teacher-id',
        },
      };

      prisma.module.findUnique.mockResolvedValue(mockModule);

      const result = await service.isTeacherOwnerOfModule({
        teacherId: 'teacher-id',
        moduleId: 'module-id',
      });

      expect(result).toBe(false);
    });

    it('should return true if teacher owns module', async () => {
      prisma.module.findUnique.mockResolvedValue({
        course: {
          instructorId: 'teacher-id',
        },
      } as ModuleWithCourse);

      const result = await service.isTeacherOwnerOfModule({
        teacherId: 'teacher-id',
        moduleId: 'module-id',
      });

      expect(prisma.module.findUnique).toHaveBeenCalledWith({
        where: { id: 'module-id' },
        select: {
          course: {
            select: {
              instructorId: true,
            },
          },
        },
      });

      expect(result).toBe(true);
    });

    it('should return false if no module or instructor', async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      const result = await service.isTeacherOwnerOfModule({
        teacherId: 'teacher-id',
        moduleId: 'module-id',
      });

      expect(result).toBe(false);
    });
  });

  describe('studentHasAccessToLesson', () => {
    it('should return true if student has active enrollment in course', async () => {
      prisma.module.findUnique.mockResolvedValue({
        id: 'module-id',
        title: 'Some Module',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        courseId: 'course-id',
      });
      prisma.enrollment.findFirst.mockResolvedValue({
        id: 'enrollment-id',
        courseId: 'course-id',
        userId: 'student-id',
        enrolledAt: new Date(),
        completedAt: null,
        status: 'ACTIVE',
      });

      const result = await service.studentHasAccessToLesson(
        'student-id',
        'module-id',
      );

      expect(prisma.module.findUnique).toHaveBeenCalledWith({
        where: { id: 'module-id' },
        select: { courseId: true },
      });
      expect(prisma.enrollment.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'student-id',
          courseId: 'course-id',
          status: 'ACTIVE',
        },
      });
      expect(result).toBe(true);
    });

    it('should return false if no enrollment', async () => {
      prisma.module.findUnique.mockResolvedValue({
        id: 'module-id',
        title: 'Some Module',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        courseId: 'course-id',
      });
      prisma.enrollment.findFirst.mockResolvedValue(null);

      const result = await service.studentHasAccessToLesson(
        'student-id',
        'module-id',
      );

      expect(result).toBe(false);
    });
  });

  describe('findAvailableLessonsForStudent', () => {
    it('should return lessons if student has active enrollment', async () => {
      prisma.enrollment.findFirst.mockResolvedValue({
        id: 'enrollment-id',
        courseId: 'course-id',
        userId: 'student-id',
        enrolledAt: new Date(),
        completedAt: null,
        status: 'ACTIVE',
      });

      const lessons = [
        {
          id: 'lesson-1',
          title: 'Lesson 1',
          content: 'Content 1',
          lessonType: LessonType.EXERCISE,
          videoUrl: null,
          duration: null,
          moduleId: 'module-1',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'lesson-2',
          title: 'Lesson 2',
          content: 'Content 2',
          lessonType: LessonType.QUIZ,
          videoUrl: 'http://video.url',
          duration: 60,
          moduleId: 'module-1',
          order: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prisma.lesson.findMany.mockResolvedValue(lessons);

      const result = await service.findAvailableLessonsForStudent(
        'student-id',
        'course-id',
      );

      expect(prisma.enrollment.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'student-id',
          courseId: 'course-id',
          status: 'ACTIVE',
        },
      });
      expect(prisma.lesson.findMany).toHaveBeenCalledWith({
        where: { module: { courseId: 'course-id' } },
        orderBy: { order: 'asc' },
      });
      expect(result).toEqual(lessons);
    });

    it('should throw ForbiddenException if no enrollment is found', async () => {
      prisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.findAvailableLessonsForStudent('student-id', 'course-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findExistentModule', () => {
    it('should return module if exists', async () => {
      const module = {
        id: 'module-id',
        title: 'Some Module',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        courseId: 'course-id',
      };

      prisma.module.findUnique.mockResolvedValue(module);

      const result = await service.findExistentModule('module-id');

      expect(prisma.module.findUnique).toHaveBeenCalledWith({
        where: { id: 'module-id' },
      });
      expect(result).toEqual(module);
    });

    it('should return null if module does not exist', async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      const result = await service.findExistentModule('module-id');

      expect(result).toBeNull();
    });
  });
});
