import { Test, TestingModule } from '@nestjs/testing';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ProgressController', () => {
  let controller: ProgressController;
  let service: ProgressService;

  const mockProgressId = randomUUID();
  const mockUserId = randomUUID();
  const mockCourseId = randomUUID();
  const mockAdminId = randomUUID();
  const mockStudentId = randomUUID();

  const mockProgress = {
    id: mockProgressId,
    userId: mockUserId,
    courseId: mockCourseId,
    completedLessons: 5,
    totalLessons: 10,
    progressPercentage: 50,
  };

  const mockPrismaService = {
    progress: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
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
      sub: mockUserId,
      role: 'STUDENT',
    },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressController],
      providers: [
        ProgressService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<ProgressController>(ProgressController);
    service = module.get<ProgressService>(ProgressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of progress for ADMIN', async () => {
      mockPrismaService.progress.findMany.mockResolvedValue([mockProgress]);

      const result = await controller.findAll(mockAuthenticatedAdminRequest);

      expect(result).toEqual([mockProgress]);
      expect(mockPrismaService.progress.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return progress by ID for ADMIN', async () => {
      mockPrismaService.progress.findUnique.mockResolvedValue(mockProgress);

      const result = await controller.findAll(mockAuthenticatedAdminRequest, mockProgressId);

      expect(result).toEqual(mockProgress);
      expect(mockPrismaService.progress.findUnique).toHaveBeenCalledWith({ where: { id: mockProgressId } });
    });

    it('should return own progress for STUDENT', async () => {
      mockPrismaService.progress.findMany.mockResolvedValue([mockProgress]);

      const result = await controller.findAll(mockAuthenticatedStudentRequest);

      expect(result).toEqual([mockProgress]);
      expect(mockPrismaService.progress.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId: mockUserId,
        },
      }));
    });

    it('should return specific progress for STUDENT if it belongs to them', async () => {
      mockPrismaService.progress.findUnique.mockResolvedValue(mockProgress);

      const result = await controller.findAll(mockAuthenticatedStudentRequest, mockProgressId);

      expect(result).toEqual(mockProgress);
      expect(mockPrismaService.progress.findUnique).toHaveBeenCalledWith({ where: { id: mockProgressId } });
    });

    it('should throw ForbiddenException for STUDENT accessing other user progress', async () => {
      mockPrismaService.progress.findUnique.mockResolvedValue({ ...mockProgress, userId: randomUUID() });

      await expect(controller.findAll(mockAuthenticatedStudentRequest, mockProgressId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(controller.findAll(mockAuthenticatedAdminRequest, 'invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when progress not found', async () => {
      mockPrismaService.progress.findUnique.mockResolvedValue(null);

      await expect(controller.findAll(mockAuthenticatedAdminRequest, randomUUID())).rejects.toThrow(NotFoundException);
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.progress.findMany.mockResolvedValue([]);

      const filters = {
        userId: randomUUID(),
        courseId: randomUUID(),
        limit: '10',
        offset: '0',
      };

      await controller.findAll(
        mockAuthenticatedAdminRequest,
        undefined,
        filters.userId,
        filters.courseId,
        filters.limit,
        filters.offset,
      );

      expect(mockPrismaService.progress.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId: filters.userId,
          courseId: filters.courseId,
        },
        take: 10,
        skip: 0,
      }));
    });
  });

  describe('create', () => {
    const createProgressDto = {
      userId: mockUserId,
      courseId: mockCourseId,
      completedLessons: 0,
      totalLessons: 0,
      progressPercentage: 0,
    };

    it('should create progress for ADMIN', async () => {
      const createdProgress = { id: randomUUID(), ...createProgressDto };
      mockPrismaService.user.findUnique.mockResolvedValue({ id: mockUserId });
      mockPrismaService.course.findUnique.mockResolvedValue({ id: mockCourseId });
      mockPrismaService.progress.create.mockResolvedValue(createdProgress);

      const result = await controller.create(createProgressDto, mockAuthenticatedAdminRequest);

      expect(result).toEqual(createdProgress);
      expect(mockPrismaService.progress.create).toHaveBeenCalledWith({ data: createProgressDto });
    });

    it('should create progress for STUDENT for themselves', async () => {
      const createdProgress = { id: randomUUID(), ...createProgressDto };
      mockPrismaService.user.findUnique.mockResolvedValue({ id: mockUserId });
      mockPrismaService.course.findUnique.mockResolvedValue({ id: mockCourseId });
      mockPrismaService.progress.create.mockResolvedValue(createdProgress);

      const result = await controller.create({ courseId: mockCourseId }, mockAuthenticatedStudentRequest);

      expect(result).toEqual(createdProgress);
      expect(mockPrismaService.progress.create).toHaveBeenCalledWith({ data: { userId: mockUserId, courseId: mockCourseId, completedLessons: 0, totalLessons: 0, progressPercentage: 0 } });
    });

    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = { userId: 'invalid-id', courseId: 'invalid-id' };
      await expect(controller.create(invalidDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException for STUDENT creating progress for another user", async () => {
      const otherUserId = randomUUID();
      const otherStudentRequest = { user: { sub: otherUserId, role: 'STUDENT' } } as AuthenticatedRequest;

      await expect(controller.create(createProgressDto, otherStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.course.findUnique.mockResolvedValue({ id: mockCourseId });

      await expect(controller.create(createProgressDto, mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if course not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: mockUserId });
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(controller.create(createProgressDto, mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = { completedLessons: 6, progressPercentage: 60 };

    it('should update progress for ADMIN', async () => {
      const updatedProgress = { ...mockProgress, ...updateDto };
      mockPrismaService.progress.findUnique.mockResolvedValue(mockProgress);
      mockPrismaService.progress.update.mockResolvedValue(updatedProgress);

      const result = await controller.update(mockProgressId, updateDto, mockAuthenticatedAdminRequest);

      expect(result).toEqual(updatedProgress);
      expect(mockPrismaService.progress.update).toHaveBeenCalledWith({ where: { id: mockProgressId }, data: updateDto });
    });

    it('should update own progress for STUDENT', async () => {
      const updatedProgress = { ...mockProgress, ...updateDto };
      mockPrismaService.progress.findUnique.mockResolvedValue(mockProgress);
      mockPrismaService.progress.update.mockResolvedValue(updatedProgress);

      const result = await controller.update(mockProgressId, updateDto, mockAuthenticatedStudentRequest);

      expect(result).toEqual(updatedProgress);
      expect(mockPrismaService.progress.update).toHaveBeenCalledWith({ where: { id: mockProgressId }, data: updateDto });
    });

    it('should throw ForbiddenException for STUDENT updating other user progress', async () => {
      mockPrismaService.progress.findUnique.mockResolvedValue({ ...mockProgress, userId: randomUUID() });

      await expect(controller.update(mockProgressId, updateDto, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = { completedLessons: 'invalid' };
      await expect(controller.update(mockProgressId, invalidDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for invalid ID", async () => {
      await expect(controller.update('invalid-id', updateDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when progress not found', async () => {
      mockPrismaService.progress.findUnique.mockResolvedValue(null);

      await expect(controller.update(randomUUID(), updateDto, mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete progress for ADMIN', async () => {
      mockPrismaService.progress.findUnique.mockResolvedValue(mockProgress);
      mockPrismaService.progress.delete.mockResolvedValue(mockProgress);

      const result = await controller.remove(mockProgressId, mockAuthenticatedAdminRequest);

      expect(result).toEqual({ message: 'Progress deleted' });
      expect(mockPrismaService.progress.delete).toHaveBeenCalledWith({ where: { id: mockProgressId } });
    });

    it('should delete own progress for STUDENT', async () => {
      mockPrismaService.progress.findUnique.mockResolvedValue(mockProgress);
      mockPrismaService.progress.delete.mockResolvedValue(mockProgress);

      const result = await controller.remove(mockProgressId, mockAuthenticatedStudentRequest);

      expect(result).toEqual({ message: 'Progress deleted' });
      expect(mockPrismaService.progress.delete).toHaveBeenCalledWith({ where: { id: mockProgressId } });
    });

    it('should throw ForbiddenException for STUDENT deleting other user progress', async () => {
      mockPrismaService.progress.findUnique.mockResolvedValue({ ...mockProgress, userId: randomUUID() });

      await expect(controller.remove(mockProgressId, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException for invalid ID", async () => {
      await expect(controller.remove("invalid-id", mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when progress not found', async () => {
      mockPrismaService.progress.findUnique.mockResolvedValue(null);

      await expect(controller.remove(randomUUID(), mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });
});