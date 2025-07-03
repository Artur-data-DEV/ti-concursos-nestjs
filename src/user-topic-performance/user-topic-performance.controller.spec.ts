import { Test, TestingModule } from '@nestjs/testing';
import { UserTopicPerformanceController } from './user-topic-performance.controller';
import { UserTopicPerformanceService } from './user-topic-performance.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('UserTopicPerformanceController', () => {
  let controller: UserTopicPerformanceController;
  let service: UserTopicPerformanceService;

  const mockUserTopicPerformanceId = randomUUID();
  const mockUserId = randomUUID();
  const mockTopicId = randomUUID();
  const mockAdminId = randomUUID();
  const mockStudentId = randomUUID();

  const mockUserTopicPerformance = {
    id: mockUserTopicPerformanceId,
    userId: mockUserId,
    topicId: mockTopicId,
    correctAnswers: 10,
    totalQuestions: 15,
    accuracy: 0.66,
    lastAttempt: new Date(),
  };

  const mockPrismaService = {
    userTopicPerformance: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    topic: {
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
      controllers: [UserTopicPerformanceController],
      providers: [
        UserTopicPerformanceService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<UserTopicPerformanceController>(UserTopicPerformanceController);
    service = module.get<UserTopicPerformanceService>(UserTopicPerformanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of user topic performances for any authenticated user', async () => {
      mockPrismaService.userTopicPerformance.findMany.mockResolvedValue([mockUserTopicPerformance]);

      const result = await controller.findAll(mockAuthenticatedStudentRequest);

      expect(result).toEqual([mockUserTopicPerformance]);
      expect(mockPrismaService.userTopicPerformance.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return user topic performance by ID for any authenticated user', async () => {
      mockPrismaService.userTopicPerformance.findUnique.mockResolvedValue(mockUserTopicPerformance);

      const result = await controller.findAll(mockAuthenticatedStudentRequest, mockUserTopicPerformanceId);

      expect(result).toEqual(mockUserTopicPerformance);
      expect(mockPrismaService.userTopicPerformance.findUnique).toHaveBeenCalledWith({ where: { id: mockUserTopicPerformanceId } });
    });

    it('should throw BadRequestException for invalid user topic performance ID', async () => {
      await expect(controller.findAll(mockAuthenticatedStudentRequest, 'invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user topic performance not found', async () => {
      mockPrismaService.userTopicPerformance.findUnique.mockResolvedValue(null);

      await expect(controller.findAll(mockAuthenticatedStudentRequest, randomUUID())).rejects.toThrow(NotFoundException);
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.userTopicPerformance.findMany.mockResolvedValue([]);

      const filters = {
        userId: randomUUID(),
        topicId: randomUUID(),
        limit: '10',
        offset: '0',
      };

      await controller.findAll(
        mockAuthenticatedStudentRequest,
        undefined,
        filters.userId,
        filters.topicId,
        filters.limit,
        filters.offset,
      );

      expect(mockPrismaService.userTopicPerformance.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId: filters.userId,
          topicId: filters.topicId,
        },
        take: 10,
        skip: 0,
      }));
    });
  });

  describe('create', () => {
    const createUserTopicPerformanceDto = {
      userId: mockUserId,
      topicId: mockTopicId,
      correctAnswers: 5,
      totalQuestions: 10,
    };

    it('should create user topic performance for STUDENT for themselves', async () => {
      const createdUserTopicPerformance = { id: randomUUID(), ...createUserTopicPerformanceDto, accuracy: 0.5, lastAttempt: new Date() };
      mockPrismaService.user.findUnique.mockResolvedValue({ id: mockUserId });
      mockPrismaService.topic.findUnique.mockResolvedValue({ id: mockTopicId });
      mockPrismaService.userTopicPerformance.create.mockResolvedValue(createdUserTopicPerformance);

      const result = await controller.create(createUserTopicPerformanceDto, mockAuthenticatedStudentRequest);

      expect(result).toEqual(createdUserTopicPerformance);
      expect(mockPrismaService.userTopicPerformance.create).toHaveBeenCalledWith({ data: expect.objectContaining(createUserTopicPerformance) });
    });

    it('should throw ForbiddenException for STUDENT creating user topic performance for another user', async () => {
      const otherUserId = randomUUID();
      const otherStudentRequest = { user: { sub: otherUserId, role: 'STUDENT' } } as AuthenticatedRequest;

      await expect(controller.create(createUserTopicPerformanceDto, otherStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { ...createUserTopicPerformanceDto, correctAnswers: 15, totalQuestions: 10 };
      await expect(controller.create(invalidDto, mockAuthenticatedStudentRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.topic.findUnique.mockResolvedValue({ id: mockTopicId });

      await expect(controller.create(createUserTopicPerformanceDto, mockAuthenticatedStudentRequest)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if topic not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: mockUserId });
      mockPrismaService.topic.findUnique.mockResolvedValue(null);

      await expect(controller.create(createUserTopicPerformanceDto, mockAuthenticatedStudentRequest)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = { correctAnswers: 12, totalQuestions: 15 };

    it('should update user topic performance for ADMIN', async () => {
      const updatedUserTopicPerformance = { ...mockUserTopicPerformance, ...updateDto, accuracy: 0.8 };
      mockPrismaService.userTopicPerformance.findUnique.mockResolvedValue(mockUserTopicPerformance);
      mockPrismaService.userTopicPerformance.update.mockResolvedValue(updatedUserTopicPerformance);

      const result = await controller.update(mockUserTopicPerformanceId, updateDto, mockAuthenticatedAdminRequest);

      expect(result).toEqual(updatedUserTopicPerformance);
      expect(mockPrismaService.userTopicPerformance.update).toHaveBeenCalledWith({ where: { id: mockUserTopicPerformanceId }, data: expect.objectContaining(updateDto) });
    });

    it('should update own user topic performance for STUDENT', async () => {
      const updatedUserTopicPerformance = { ...mockUserTopicPerformance, ...updateDto, accuracy: 0.8 };
      mockPrismaService.userTopicPerformance.findUnique.mockResolvedValue(mockUserTopicPerformance);
      mockPrismaService.userTopicPerformance.update.mockResolvedValue(updatedUserTopicPerformance);

      const result = await controller.update(mockUserTopicPerformanceId, updateDto, mockAuthenticatedStudentRequest);

      expect(result).toEqual(updatedUserTopicPerformance);
      expect(mockPrismaService.userTopicPerformance.update).toHaveBeenCalledWith({ where: { id: mockUserTopicPerformanceId }, data: expect.objectContaining(updateDto) });
    });

    it('should throw ForbiddenException for STUDENT updating other user topic performance', async () => {
      mockPrismaService.userTopicPerformance.findUnique.mockResolvedValue({ ...mockUserTopicPerformance, userId: randomUUID() });

      await expect(controller.update(mockUserTopicPerformanceId, updateDto, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(controller.update('invalid-id', updateDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { correctAnswers: 20, totalQuestions: 10 };
      await expect(controller.update(mockUserTopicPerformanceId, invalidDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user topic performance not found', async () => {
      mockPrismaService.userTopicPerformance.findUnique.mockResolvedValue(null);

      await expect(controller.update(randomUUID(), updateDto, mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete user topic performance for ADMIN', async () => {
      mockPrismaService.userTopicPerformance.findUnique.mockResolvedValue(mockUserTopicPerformance);
      mockPrismaService.userTopicPerformance.delete.mockResolvedValue(mockUserTopicPerformance);

      const result = await controller.remove(mockUserTopicPerformanceId, mockAuthenticatedAdminRequest);

      expect(result).toEqual({ message: 'User topic performance deleted' });
      expect(mockPrismaService.userTopicPerformance.delete).toHaveBeenCalledWith({ where: { id: mockUserTopicPerformanceId } });
    });

    it('should delete own user topic performance for STUDENT', async () => {
      mockPrismaService.userTopicPerformance.findUnique.mockResolvedValue(mockUserTopicPerformance);
      mockPrismaService.userTopicPerformance.delete.mockResolvedValue(mockUserTopicPerformance);

      const result = await controller.remove(mockUserTopicPerformanceId, mockAuthenticatedStudentRequest);

      expect(result).toEqual({ message: 'User topic performance deleted' });
      expect(mockPrismaService.userTopicPerformance.delete).toHaveBeenCalledWith({ where: { id: mockUserTopicPerformanceId } });
    });

    it('should throw ForbiddenException for STUDENT deleting other user topic performance', async () => {
      mockPrismaService.userTopicPerformance.findUnique.mockResolvedValue({ ...mockUserTopicPerformance, userId: randomUUID() });

      await expect(controller.remove(mockUserTopicPerformanceId, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(controller.remove('invalid-id', mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user topic performance not found', async () => {
      mockPrismaService.userTopicPerformance.findUnique.mockResolvedValue(null);

      await expect(controller.remove(randomUUID(), mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });
});

