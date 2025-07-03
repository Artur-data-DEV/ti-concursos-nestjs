import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteQuestionsController } from './favorite-questions.controller';
import { FavoriteQuestionsService } from './favorite-questions.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('FavoriteQuestionsController', () => {
  let controller: FavoriteQuestionsController;
  let service: FavoriteQuestionsService;

  const mockFavoriteQuestionId = randomUUID();
  const mockUserId = randomUUID();
  const mockQuestionId = randomUUID();
  const mockAdminId = randomUUID();
  const mockStudentId = randomUUID();

  const mockFavoriteQuestion = {
    id: mockFavoriteQuestionId,
    userId: mockUserId,
    questionId: mockQuestionId,
    createdAt: new Date(),
  };

  const mockPrismaService = {
    favoriteQuestion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    question: {
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
      controllers: [FavoriteQuestionsController],
      providers: [
        FavoriteQuestionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<FavoriteQuestionsController>(FavoriteQuestionsController);
    service = module.get<FavoriteQuestionsService>(FavoriteQuestionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of favorite questions for any authenticated user', async () => {
      mockPrismaService.favoriteQuestion.findMany.mockResolvedValue([mockFavoriteQuestion]);

      const result = await controller.findAll(mockAuthenticatedStudentRequest);

      expect(result).toEqual([mockFavoriteQuestion]);
      expect(mockPrismaService.favoriteQuestion.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return favorite question by ID for any authenticated user', async () => {
      mockPrismaService.favoriteQuestion.findUnique.mockResolvedValue(mockFavoriteQuestion);

      const result = await controller.findAll(mockAuthenticatedStudentRequest, mockFavoriteQuestionId);

      expect(result).toEqual(mockFavoriteQuestion);
      expect(mockPrismaService.favoriteQuestion.findUnique).toHaveBeenCalledWith({ where: { id: mockFavoriteQuestionId } });
    });

    it('should throw BadRequestException for invalid favorite question ID', async () => {
      await expect(controller.findAll(mockAuthenticatedStudentRequest, 'invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when favorite question not found', async () => {
      mockPrismaService.favoriteQuestion.findUnique.mockResolvedValue(null);

      await expect(controller.findAll(mockAuthenticatedStudentRequest, randomUUID())).rejects.toThrow(NotFoundException);
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.favoriteQuestion.findMany.mockResolvedValue([]);

      const filters = {
        userId: randomUUID(),
        questionId: randomUUID(),
        limit: '10',
        offset: '0',
      };

      await controller.findAll(
        mockAuthenticatedStudentRequest,
        undefined,
        filters.userId,
        filters.questionId,
        filters.limit,
        filters.offset,
      );

      expect(mockPrismaService.favoriteQuestion.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId: filters.userId,
          questionId: filters.questionId,
        },
        take: 10,
        skip: 0,
      }));
    });
  });

  describe('create', () => {
    const createFavoriteQuestionDto = {
      userId: mockUserId,
      questionId: mockQuestionId,
    };

    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = { userId: 'invalid', questionId: 'invalid' };
      await expect(controller.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it("should create favorite question for STUDENT for themselves", async () => {
      const createdFavoriteQuestion = { id: randomUUID(), ...createFavoriteQuestionDto, createdAt: new Date() };
      mockPrismaService.user.findUnique.mockResolvedValue({ id: mockUserId });
      mockPrismaService.question.findUnique.mockResolvedValue({ id: mockQuestionId });
      mockPrismaService.favoriteQuestion.create.mockResolvedValue(createdFavoriteQuestion);

      const result = await controller.create(createFavoriteQuestionDto);

      expect(result).toEqual(createdFavoriteQuestion);
      expect(mockPrismaService.favoriteQuestion.create).toHaveBeenCalledWith({ data: createFavoriteQuestionDto });
    });

    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = { userId: 'invalid', questionId: 'invalid' };
      await expect(controller.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException for STUDENT creating favorite question for another user", async () => {
      const otherUserId = randomUUID();
      const otherStudentRequest = { user: { sub: otherUserId, role: 'STUDENT' } } as AuthenticatedRequest;

      await expect(controller.create(createFavoriteQuestionDto)).rejects.toThrow(ForbiddenException);
    });

    it("should throw NotFoundException if user not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.question.findUnique.mockResolvedValue({ id: mockQuestionId });

      await expect(controller.create(createFavoriteQuestionDto)).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if question not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: mockUserId });
      mockPrismaService.question.findUnique.mockResolvedValue(null);

      await expect(controller.create(createFavoriteQuestionDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete favorite question for ADMIN', async () => {
      mockPrismaService.favoriteQuestion.findUnique.mockResolvedValue(mockFavoriteQuestion);
      mockPrismaService.favoriteQuestion.delete.mockResolvedValue(mockFavoriteQuestion);

      const result = await controller.remove(mockFavoriteQuestionId, mockAuthenticatedAdminRequest);

      expect(result).toEqual({ message: 'Favorite question deleted' });
      expect(mockPrismaService.favoriteQuestion.delete).toHaveBeenCalledWith({ where: { id: mockFavoriteQuestionId } });
    });

    it('should delete own favorite question for STUDENT', async () => {
      mockPrismaService.favoriteQuestion.findUnique.mockResolvedValue(mockFavoriteQuestion);
      mockPrismaService.favoriteQuestion.delete.mockResolvedValue(mockFavoriteQuestion);

      const result = await controller.remove(mockFavoriteQuestionId, mockAuthenticatedStudentRequest);

      expect(result).toEqual({ message: 'Favorite question deleted' });
      expect(mockPrismaService.favoriteQuestion.delete).toHaveBeenCalledWith({ where: { id: mockFavoriteQuestionId } });
    });

    it("should throw BadRequestException for invalid ID", async () => {
      await expect(controller.remove('invalid-id', mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException for STUDENT deleting other user favorite question", async () => {
      mockPrismaService.favoriteQuestion.findUnique.mockResolvedValue({ ...mockFavoriteQuestion, userId: randomUUID() });

      await expect(controller.remove(mockFavoriteQuestionId, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when favorite question not found', async () => {
      mockPrismaService.favoriteQuestion.findUnique.mockResolvedValue(null);

      await expect(controller.remove(randomUUID(), mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });
});

