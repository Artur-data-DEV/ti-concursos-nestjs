import { Test, TestingModule } from '@nestjs/testing';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('CoursesController', () => {
  let controller: CoursesController;
  let service: CoursesService;

  const mockCourseId = randomUUID();
  const mockAdminId = randomUUID();
  const mockStudentId = randomUUID();

  const mockCourse = {
    id: mockCourseId,
    title: 'Test Course',
    description: 'This is a test course',
    authorId: randomUUID(),
  };

  const mockPrismaService = {
    course: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAuthenticatedAdminRequest: AuthenticatedRequest = {
    user: {
      sub: mockAdminId,
      role: 'ADMIN',
    },
  } as AuthenticatedRequest;

  const mockAuthenticatedStudentRequest: AuthenticatedRequest = {
    user: {
      sub: mockStudentId,
      role: 'STUDENT',
    },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
    service = module.get<CoursesService>(CoursesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of courses for any authenticated user', async () => {
      mockPrismaService.course.findMany.mockResolvedValue([mockCourse]);

      const result = await controller.findAll(mockAuthenticatedStudentRequest);

      expect(result).toEqual([mockCourse]);
      expect(mockPrismaService.course.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return course by ID for any authenticated user', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);

      const result = await controller.findAll(mockAuthenticatedStudentRequest, mockCourseId);

      expect(result).toEqual(mockCourse);
      expect(mockPrismaService.course.findUnique).toHaveBeenCalledWith({ where: { id: mockCourseId } });
    });

    it('should throw BadRequestException for invalid course ID', async () => {
      await expect(controller.findAll(mockAuthenticatedStudentRequest, 'invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when course not found', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(controller.findAll(mockAuthenticatedStudentRequest, randomUUID())).rejects.toThrow(NotFoundException);
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.course.findMany.mockResolvedValue([]);

      const filters = {
        authorId: randomUUID(),
        limit: '10',
        offset: '0',
      };

      await controller.findAll(
        mockAuthenticatedStudentRequest,
        undefined,
        filters.authorId,
        filters.limit,
        filters.offset,
      );

      expect(mockPrismaService.course.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          authorId: filters.authorId,
        },
        take: 10,
        skip: 0,
      }));
    });
  });

  describe('create', () => {
    const createCourseDto = {
      title: 'New Course',
      description: 'Description of new course',
    };

    it('should create course for ADMIN', async () => {
      const createdCourse = { id: randomUUID(), ...createCourseDto, authorId: mockAdminId };
      mockPrismaService.course.create.mockResolvedValue(createdCourse);

      const result = await controller.create(createCourseDto, mockAuthenticatedAdminRequest);

      expect(result).toEqual(createdCourse);
      expect(mockPrismaService.course.create).toHaveBeenCalledWith({ data: { ...createCourseDto, authorId: mockAdminId } });
    });

    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = { ...createCourseDto, title: '' };
      await expect(controller.create(invalidDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException for STUDENT", async () => {
      await expect(controller.create(createCourseDto, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("update", () => {
    const updateDto = { title: "Updated Course" };

    it("should update course for ADMIN", async () => {
      const updatedCourse = { ...mockCourse, ...updateDto };
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.course.update.mockResolvedValue(updatedCourse);

      const result = await controller.update(mockCourseId, updateDto, mockAuthenticatedAdminRequest);

      expect(result).toEqual(updatedCourse);
      expect(mockPrismaService.course.update).toHaveBeenCalledWith({ where: { id: mockCourseId }, data: updateDto });
    });

    it("should throw BadRequestException for invalid ID", async () => {
      await expect(controller.update("invalid-id", updateDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = { title: "" };
      await expect(controller.update(mockCourseId, invalidDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should delete course for ADMIN", async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.course.delete.mockResolvedValue(mockCourse);

      const result = await controller.remove(mockCourseId, mockAuthenticatedAdminRequest);

      expect(result).toEqual({ message: "Course deleted" });
      expect(mockPrismaService.course.delete).toHaveBeenCalledWith({ where: { id: mockCourseId } });
    });

    it("should throw BadRequestException for invalid ID", async () => {
      await expect(controller.remove("invalid-id", mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when course not found", async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(controller.update(randomUUID(), updateDto, mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for STUDENT", async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);

      await expect(controller.update(mockCourseId, updateDto, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });