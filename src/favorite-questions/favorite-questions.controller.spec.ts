/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { FavoriteQuestionsController } from './favorite-questions.controller';
import { FavoriteQuestionsService } from './favorite-questions.service';

import { adminReq, studentReq } from '../__mocks__/user_mocks';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Difficulty, QuestionType, UserRole } from '@prisma/client';

describe('FavoriteQuestionsController', () => {
  let controller: FavoriteQuestionsController;
  let favoriteQuestionsService: DeepMockProxy<FavoriteQuestionsService>;

  const mockQuestionId = randomUUID();

  const mockFavoriteQuestion = {
    userId: studentReq.user.sub,
    questionId: mockQuestionId,
    markedAt: new Date('2025-07-04T12:00:00Z'),
  };

  const mockQuestion = {
    id: mockQuestionId,
    createdAt: new Date('2025-07-04T12:00:00Z'),
    updatedAt: new Date('2025-07-04T12:00:00Z'),
    text: 'Pergunta de exemplo',
    questionType: QuestionType.MULTIPLA_ESCOLHA,
    difficulty: Difficulty.FACIL,
    topicId: 'topic-uuid',
    subtopicId: null,
    explanation: null,
    bancaId: 'banca-uuid',
    sourceConcurso: 'Concurso Exemplo',
    sourceCargo: 'Cargo Exemplo',
    sourceYear: 2025,
    questionStatus: 'ATIVA',
    questionSubject: 'Assunto Exemplo',
    sourceUrl: null,
    authorId: null,
  };

  beforeEach(async () => {
    favoriteQuestionsService = mockDeep<FavoriteQuestionsService>();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoriteQuestionsController],
      providers: [
        {
          provide: FavoriteQuestionsService,
          useValue: favoriteQuestionsService,
        },
      ],
    }).compile();

    controller = module.get<FavoriteQuestionsController>(
      FavoriteQuestionsController,
    );

    jest.useFakeTimers().setSystemTime(new Date('2025-07-04T12:00:00Z'));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return list of favorite questions for any authenticated user', async () => {
      favoriteQuestionsService.findManyByUserId.mockResolvedValue([
        mockFavoriteQuestion,
      ]);

      const result = await controller.findAll(studentReq);

      expect(result).toEqual([mockFavoriteQuestion]);
      expect(favoriteQuestionsService.findManyByUserId).toHaveBeenCalledWith(
        studentReq.user.sub,
      );
    });
  });

  describe('findOne', () => {
    it('should return favorite question by userId and questionId', async () => {
      favoriteQuestionsService.findOne.mockResolvedValue(mockFavoriteQuestion);

      const result = await controller.findOne(
        studentReq,
        studentReq.user.sub,
        mockQuestionId,
      );

      expect(result).toEqual(mockFavoriteQuestion);
      expect(favoriteQuestionsService.findOne).toHaveBeenCalledWith({
        userId_questionId: {
          userId: studentReq.user.sub,
          questionId: mockQuestionId,
        },
      });
    });

    it('should throw BadRequestException if userId or questionId are invalid UUIDs', async () => {
      await expect(
        controller.findOne(studentReq, 'invalid-uuid', 'invalid-uuid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if favorite question not found', async () => {
      favoriteQuestionsService.findOne.mockResolvedValue(null);

      await expect(
        controller.findOne(studentReq, studentReq.user.sub, mockQuestionId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createFavoriteQuestionDto = {
      userId: studentReq.user.sub,
      questionId: mockQuestionId,
      markedAt: new Date('2025-07-04T12:00:00Z'),
    };

    it('should throw BadRequestException for invalid UUIDs', async () => {
      const invalidDto = {
        userId: 'invalid',
        questionId: 'invalid',
        markedAt: new Date('2025-07-04T12:00:00Z'),
      };

      await expect(controller.create(invalidDto, adminReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create favorite question for STUDENT for themselves', async () => {
      favoriteQuestionsService.findUser.mockResolvedValue({
        id: studentReq.user.sub,
        name: 'Test User',
        email: 'testuser@example.com',
        emailVerified: null,
        image: null,
        role: UserRole.STUDENT,
        bio: null,
        socialLinks: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      favoriteQuestionsService.findQuestionById.mockResolvedValue(mockQuestion);
      favoriteQuestionsService.create.mockResolvedValue(
        createFavoriteQuestionDto,
      );

      const result = await controller.create(
        createFavoriteQuestionDto,
        studentReq,
      );

      expect(result).toEqual(createFavoriteQuestionDto);
      expect(favoriteQuestionsService.create).toHaveBeenCalledWith({
        user: { connect: { id: createFavoriteQuestionDto.userId } },
        question: { connect: { id: createFavoriteQuestionDto.questionId } },
        markedAt: expect.any(Date) as Date,
      });
    });

    it('should throw ForbiddenException if STUDENT tries to create favorite question for another user', async () => {
      const otherStudentRequest = {
        user: { sub: randomUUID(), role: UserRole.STUDENT },
      } as typeof studentReq;

      favoriteQuestionsService.findUser.mockResolvedValue({
        id: otherStudentRequest.user.sub,
        email: 'otherstudent@example.com',
        name: 'Other Student',
        emailVerified: null,
        image: null,
        role: UserRole.STUDENT,
        bio: null,
        socialLinks: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      favoriteQuestionsService.findQuestionById.mockResolvedValue(mockQuestion);

      await expect(
        controller.create(createFavoriteQuestionDto, otherStudentRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      favoriteQuestionsService.findUser.mockResolvedValue(null);
      favoriteQuestionsService.findQuestionById.mockResolvedValue(mockQuestion);

      const fakeUserId = randomUUID();

      const dtoWithNonExistentUser = {
        userId: fakeUserId,
        questionId: mockQuestionId,
        markedAt: new Date(),
      };

      await expect(
        controller.create(dtoWithNonExistentUser, {
          user: { sub: fakeUserId, role: UserRole.STUDENT },
        } as typeof studentReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if question not found', async () => {
      favoriteQuestionsService.findUser.mockResolvedValue({
        id: studentReq.user.sub,
        email: 'otherstudent@example.com',
        name: 'Other Student',
        emailVerified: null,
        image: null,
        role: UserRole.STUDENT,
        bio: null,
        socialLinks: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      favoriteQuestionsService.findQuestionById.mockResolvedValue(null);

      await expect(
        controller.create(createFavoriteQuestionDto, studentReq),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete favorite question for ADMIN', async () => {
      favoriteQuestionsService.findOne.mockResolvedValue(mockFavoriteQuestion);
      favoriteQuestionsService.remove.mockResolvedValue({
        markedAt: new Date(),
        questionId: mockQuestionId,
        userId: adminReq.user.sub,
      });

      const result = await controller.remove(
        adminReq.user.sub,
        mockQuestionId,
        adminReq,
      );

      expect(result).toEqual({ message: 'Favorite question deleted' });
      expect(favoriteQuestionsService.remove).toHaveBeenCalledWith({
        userId_questionId: {
          userId: adminReq.user.sub,
          questionId: mockQuestionId,
        },
      });
    });

    it('should delete own favorite question for STUDENT', async () => {
      favoriteQuestionsService.findOne.mockResolvedValue(mockFavoriteQuestion);
      favoriteQuestionsService.remove.mockResolvedValue({
        markedAt: new Date(),
        questionId: mockQuestionId,
        userId: adminReq.user.sub,
      });

      const result = await controller.remove(
        studentReq.user.sub,
        mockQuestionId,
        studentReq,
      );

      expect(result).toEqual({ message: 'Favorite question deleted' });
      expect(favoriteQuestionsService.remove).toHaveBeenCalledWith({
        userId_questionId: {
          userId: studentReq.user.sub,
          questionId: mockQuestionId,
        },
      });
    });

    it('should throw BadRequestException for invalid IDs', async () => {
      await expect(
        controller.remove('invalid-id', mockQuestionId, adminReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if STUDENT deletes other user favorite question', async () => {
      const fakeUserId = randomUUID();

      favoriteQuestionsService.findOne.mockResolvedValue({
        ...mockFavoriteQuestion,
        userId: fakeUserId,
      });

      await expect(
        controller.remove(fakeUserId, mockQuestionId, studentReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if favorite question not found', async () => {
      favoriteQuestionsService.findOne.mockResolvedValue(null);

      await expect(
        controller.remove(studentReq.user.sub, mockQuestionId, studentReq),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
