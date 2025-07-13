/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { Course } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { createId } from '@paralleldrive/cuid2';

describe('CoursesService', () => {
  let service: CoursesService;
  let prismaService: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return filtered courses with relations', async () => {
      const mockCourses: Course[] = [
        {
          id: '1',
          title: 'Test',
          description: 'Descrição do curso',
          instructorId: 'abc',
          thumbnail: null,
          price: 0,
          isPublished: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaService.course.findMany.mockResolvedValue(mockCourses);

      const result = await service.findAll({
        title: 'Test',
        instructorId: 'abc',
        limit: '10',
        offset: '0',
      });

      expect(prismaService.course.findMany).toHaveBeenCalledWith({
        where: {
          title: { contains: 'Test', mode: 'insensitive' },
          instructorId: 'abc',
        },
        take: 10,
        skip: 0,
        include: {
          modules: { include: { lessons: true } },
          enrollments: true,
          reviews: true,
        },
      });

      expect(result).toEqual(mockCourses);
    });

    it('should handle empty filters', async () => {
      prismaService.course.findMany.mockResolvedValue([]);

      const result = await service.findAll({});

      expect(prismaService.course.findMany).toHaveBeenCalledWith({
        where: {},
        take: undefined,
        skip: undefined,
        include: {
          modules: {
            include: {
              lessons: true,
            },
          },
          enrollments: true,
          reviews: true,
        },
      });

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a course by id', async () => {
      const mockCourse = { id: '1', instructorId: 'abc' } as Course;
      prismaService.course.findUnique.mockResolvedValue(mockCourse);

      const result = await service.findOne('1');

      expect(prismaService.course.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(result).toEqual(mockCourse);
    });

    it('should return null when course not found', async () => {
      prismaService.course.findUnique.mockResolvedValue(null);

      const result = await service.findOne('not-exist');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const inputData = {
      title: 'Course',
      description: 'Desc',
      instructorId: createId(),
    };

    const createdCourse: Course = {
      id: '1',
      title: 'Course',
      description: 'Desc',
      instructorId: inputData.instructorId,
      thumbnail: null,
      price: null,
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a course', async () => {
      prismaService.course.create.mockResolvedValue(createdCourse);

      const result = await service.create(inputData);

      expect(prismaService.course.create).toHaveBeenCalledWith({
        data: inputData,
      });
      expect(result).toEqual(createdCourse);
    });

    it('should throw if prisma.create fails', async () => {
      prismaService.course.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create(inputData)).rejects.toThrow('DB error');
    });
  });

  describe('update', () => {
    it('should update a course', async () => {
      const updated: Course = {
        id: '1',
        title: 'Updated',
        instructorId: 'abc',
        description: '',
        thumbnail: null,
        price: null,
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.course.update.mockResolvedValue(updated);

      const result = await service.update('1', { title: 'Updated' });

      expect(prismaService.course.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { title: 'Updated' },
      });
      expect(result).toEqual(updated);
    });

    it('should throw on update failure', async () => {
      prismaService.course.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.update('1', { title: 'Fail' })).rejects.toThrow(
        'Update failed',
      );
    });
  });

  describe('remove', () => {
    it('should delete a course', async () => {
      const deleted = {
        id: '1',
        title: 'Deleted',
        instructorId: 'abc',
      } as Course;
      prismaService.course.delete.mockResolvedValue(deleted);

      const result = await service.remove('1');

      expect(prismaService.course.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(deleted);
    });

    it('should throw if delete fails', async () => {
      prismaService.course.delete.mockRejectedValue(new Error('Delete error'));

      await expect(service.remove('1')).rejects.toThrow('Delete error');
    });
  });
});
