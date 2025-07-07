/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteQuestionsService } from './favorite-questions.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { FavoriteQuestion, Question, User, Prisma } from '@prisma/client';

describe('FavoriteQuestionsService', () => {
  let service: FavoriteQuestionsService;
  let prismaService: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteQuestionsService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get(FavoriteQuestionsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a favorite question', async () => {
      const data: Prisma.FavoriteQuestionCreateInput = {
        markedAt: new Date(),
        question: { connect: { id: 'q1' } },
        user: { connect: { id: 'u1' } },
      };

      const mockFavoriteQuestion: FavoriteQuestion = {
        userId: 'u1',
        questionId: 'q1',
        markedAt: data.markedAt as Date,
      };

      prismaService.favoriteQuestion.create.mockResolvedValue(
        mockFavoriteQuestion,
      );

      const result = await service.create(data);

      expect(prismaService.favoriteQuestion.create).toHaveBeenCalledWith({
        data,
      });
      expect(result).toEqual(mockFavoriteQuestion);
    });
  });

  describe('findAll', () => {
    it('should return filtered favorite questions', async () => {
      const filters = {
        userId: 'u1',
        questionId: 'q1',
        limit: 10,
        offset: 0,
      };

      const mockResponse: FavoriteQuestion[] = [
        {
          userId: 'u1',
          questionId: 'q1',
          markedAt: new Date(),
        },
      ];

      prismaService.favoriteQuestion.findMany.mockResolvedValue(mockResponse);

      const result = await service.findAll(filters);

      expect(prismaService.favoriteQuestion.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'u1',
          questionId: 'q1',
        },
        take: 10,
        skip: 0,
        orderBy: { markedAt: 'desc' },
        include: { question: true, user: true },
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('findOne', () => {
    it('should return a favorite question by unique input', async () => {
      const uniqueInput: Prisma.FavoriteQuestionWhereUniqueInput = {
        userId_questionId: { userId: 'u1', questionId: 'q1' },
      };

      const mockResponse: FavoriteQuestion = {
        userId: 'u1',
        questionId: 'q1',
        markedAt: new Date(),
      };

      prismaService.favoriteQuestion.findUnique.mockResolvedValue(mockResponse);

      const result = await service.findOne(uniqueInput);

      expect(prismaService.favoriteQuestion.findUnique).toHaveBeenCalledWith({
        where: uniqueInput,
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    it('should update a favorite question', async () => {
      const uniqueInput: Prisma.FavoriteQuestionWhereUniqueInput = {
        userId_questionId: { userId: 'u1', questionId: 'q1' },
      };
      const data: Prisma.FavoriteQuestionUpdateInput = {
        markedAt: new Date(),
      };

      const mockResponse: FavoriteQuestion = {
        userId: 'u1',
        questionId: 'q1',
        markedAt: data.markedAt as Date,
      };

      prismaService.favoriteQuestion.update.mockResolvedValue(mockResponse);

      const result = await service.update(uniqueInput, data);

      expect(prismaService.favoriteQuestion.update).toHaveBeenCalledWith({
        where: uniqueInput,
        data,
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('remove', () => {
    it('should delete a favorite question', async () => {
      const uniqueInput: Prisma.FavoriteQuestionWhereUniqueInput = {
        userId_questionId: { userId: 'u1', questionId: 'q1' },
      };

      const mockResponse: FavoriteQuestion = {
        userId: 'u1',
        questionId: 'q1',
        markedAt: new Date(),
      };

      prismaService.favoriteQuestion.delete.mockResolvedValue(mockResponse);

      const result = await service.remove(uniqueInput);

      expect(prismaService.favoriteQuestion.delete).toHaveBeenCalledWith({
        where: uniqueInput,
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('findManyByUserId', () => {
    it('should return all favorite questions by userId', async () => {
      const userId = 'u1';

      const mockResponse: FavoriteQuestion[] = [
        {
          userId,
          questionId: 'q1',
          markedAt: new Date(),
        },
      ];

      prismaService.favoriteQuestion.findMany.mockResolvedValue(mockResponse);

      const result = await service.findManyByUserId(userId);

      expect(prismaService.favoriteQuestion.findMany).toHaveBeenCalledWith({
        where: { userId },
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('findQuestionById', () => {
    it('should return a question by ID', async () => {
      const questionId = 'q1';
      const mockQuestion: Question = {
        id: questionId,
        text: 'Sample content',
        explanation: 'Sample explanation',
        sourceCargo: 'Cargo XYZ',
        sourceUrl: 'https://example.com',
        sourceYear: 2021,
        questionType: 'MULTIPLA_ESCOLHA',
        difficulty: 'DIFICIL',
        topicId: 'topic1',
        subtopicId: 'subtopic1',
        bancaId: 'banca1',
        sourceConcurso: 'Concurso XYZ',
        authorId: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.question.findUnique.mockResolvedValue(mockQuestion);

      const result = await service.findQuestionById(questionId);

      expect(prismaService.question.findUnique).toHaveBeenCalledWith({
        where: { id: questionId },
      });

      expect(result).toEqual(mockQuestion);
    });
  });

  describe('findUser', () => {
    it('should return a user by ID', async () => {
      const userId = 'u1';
      const mockUser: User = {
        id: userId,
        name: 'John Doe',
        email: 'john@example.com',
        emailVerified: null,
        image: 'https://example.com/avatar.jpg',
        role: 'STUDENT', // ou ADMIN, MODERATOR etc., conforme enum definido
        bio: 'Software developer and educator',
        socialLinks: null, // ou um JSON/objeto/string, dependendo do seu schema
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findUser(userId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });

      expect(result).toEqual(mockUser);
    });
  });
});
