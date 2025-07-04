/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { Course } from '@prisma/client';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should call prisma.course.findMany with correct filters', async () => {
      const mockCourses: Course[] = [
        { id: '1', title: 'Test', instructorId: 'abc' } as Course,
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
          modules: {
            include: {
              lessons: true,
            },
          },
          enrollments: true,
          reviews: true,
        },
      });

      expect(result).toEqual(mockCourses);
    });
  });

  // Faça o mesmo para os outros métodos: findOne, create, update, remove

  describe('findOne', () => {
    it('should call prisma.course.findUnique with correct id', async () => {
      const mockCourse = { id: '1', instructorId: 'abc' };
      prismaService.course.findUnique.mockResolvedValue(mockCourse as any);

      const result = await service.findOne('1');

      expect(prismaService.course.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: {
          id: true,
          instructorId: true,
        },
      });
      expect(result).toEqual(mockCourse);
    });
  });

  describe('create', () => {
    it('should call prisma.course.create with correct data', async () => {
      const newCourse = {
        title: 'Test Course',
        description: 'A course',
        instructor: { connect: { id: 'abc' } },
      };

      const createdCourse = { ...newCourse, id: '1' };
      prismaService.course.create.mockResolvedValue(createdCourse as any);

      const result = await service.create(newCourse as any);

      expect(prismaService.course.create).toHaveBeenCalledWith({
        data: newCourse,
      });
      expect(result).toEqual(createdCourse);
    });
  });

  describe('update', () => {
    it('should call prisma.course.update with correct id and data', async () => {
      const updatedCourse = { id: '1', title: 'Updated', instructorId: 'abc' };
      prismaService.course.update.mockResolvedValue(updatedCourse as any);

      const result = await service.update('1', { title: 'Updated' });

      expect(prismaService.course.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { title: 'Updated' },
      });
      expect(result).toEqual(updatedCourse);
    });
  });

  describe('remove', () => {
    it('should call prisma.course.delete with correct id', async () => {
      const deletedCourse = { id: '1', title: 'Deleted', instructorId: 'abc' };
      prismaService.course.delete.mockResolvedValue(deletedCourse as any);

      const result = await service.remove('1');

      expect(prismaService.course.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(result).toEqual(deletedCourse);
    });
  });
});
