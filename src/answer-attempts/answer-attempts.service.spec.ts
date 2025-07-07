import { Test, TestingModule } from '@nestjs/testing';
import { AnswerAttemptsService, Filters } from './answer-attempts.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

describe('AnswerAttemptsService', () => {
  let service: AnswerAttemptsService;

  // Tipagem parcial para evitar any
  const mockPrismaService = {
    answerAttempt: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    answer: {
      findUnique: jest.fn(),
    },
  };

  const attemptId = randomUUID();
  const answerId = randomUUID();
  const userId = randomUUID();

  const mockAttempt = {
    id: attemptId,
    answerId,
    isCorrect: true,
    timeSpent: 50,
    attemptAt: new Date('2023-01-01T00:00:00Z'),
    answer: { userId },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnswerAttemptsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnswerAttemptsService>(AnswerAttemptsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve chamar findMany com filtros e retornar resultados', async () => {
      mockPrismaService.answerAttempt.findMany.mockResolvedValue([mockAttempt]);

      const filters: Filters = {
        userId,
        questionId: 'question-id',
        isCorrect: 'true',
        limit: '5',
        offset: '0',
      };

      const result = await service.findAll(filters);

      const expectedArgs: Parameters<
        typeof mockPrismaService.answerAttempt.findMany
      >[0] = {
        where: {
          answer: {
            userId: filters.userId,
            questionId: filters.questionId,
          },
          isCorrect: true,
        },
        take: 5,
        skip: 0,
        include: { answer: true },
        orderBy: { attemptAt: 'desc' },
      };

      expect(mockPrismaService.answerAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining(expectedArgs),
      );

      expect(result).toEqual([mockAttempt]);
    });

    it('deve funcionar com filtros parciais', async () => {
      mockPrismaService.answerAttempt.findMany.mockResolvedValue([mockAttempt]);

      const filters: Partial<Filters> = {
        userId,
      };

      const result = await service.findAll(filters as Filters);

      expect(mockPrismaService.answerAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining<Prisma.AnswerAttemptFindManyArgs>({
          where: {
            answer: {
              userId,
            },
          },
        }),
      );

      expect(result).toEqual([mockAttempt]);
    });
  });

  describe('findOne', () => {
    it('deve retornar tentativa pelo id', async () => {
      mockPrismaService.answerAttempt.findUnique.mockResolvedValue(mockAttempt);

      const result = await service.findOne(attemptId);

      expect(mockPrismaService.answerAttempt.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: attemptId },
          include: { answer: { select: { userId: true } } },
        }),
      );
      expect(result).toEqual(mockAttempt);
    });

    it('deve retornar null se não encontrar', async () => {
      mockPrismaService.answerAttempt.findUnique.mockResolvedValue(null);

      const result = await service.findOne('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('findAnswer', () => {
    it('deve retornar resposta pelo id', async () => {
      mockPrismaService.answer.findUnique.mockResolvedValue({ userId });

      const result = await service.findAnswer(answerId);

      expect(mockPrismaService.answer.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: answerId },
          select: { userId: true },
        }),
      );
      expect(result).toEqual({ userId });
    });
  });

  describe('create', () => {
    it('deve criar tentativa', async () => {
      const dto = {
        answerId,
        isCorrect: true,
        timeSpent: 100,
        attemptAt: new Date(),
      };
      mockPrismaService.answerAttempt.create.mockResolvedValue(dto);

      const result = await service.create(dto);

      expect(mockPrismaService.answerAttempt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            answerId: dto.answerId,
            isCorrect: dto.isCorrect,
            timeSpent: dto.timeSpent,
            attemptAt: dto.attemptAt,
          },
        }),
      );
      expect(result).toEqual(dto);
    });
  });

  describe('update', () => {
    it('deve atualizar tentativa', async () => {
      const dto = { isCorrect: false };
      mockPrismaService.answerAttempt.update.mockResolvedValue({
        ...mockAttempt,
        ...dto,
      });

      const result = await service.update(attemptId, dto);

      expect(mockPrismaService.answerAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: attemptId },
          data: dto,
        }),
      );
      expect(result).toEqual({ ...mockAttempt, ...dto });
    });

    it('deve lançar erro NotFound para tentativa não existente', async () => {
      mockPrismaService.answerAttempt.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Not found', {
          code: 'P2025',
          clientVersion: 'client',
        }),
      );

      await expect(
        service.update('id-invalido', { isCorrect: true }),
      ).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('deve remover tentativa', async () => {
      mockPrismaService.answerAttempt.delete.mockResolvedValue(mockAttempt);

      const result = await service.remove(attemptId);

      expect(mockPrismaService.answerAttempt.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: attemptId } }),
      );
      expect(result).toEqual(mockAttempt);
    });

    it('deve lançar erro NotFound para tentativa não existente', async () => {
      mockPrismaService.answerAttempt.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Not found', {
          code: 'P2025',
          clientVersion: 'client',
        }),
      );

      await expect(service.remove('id-invalido')).rejects.toThrow();
    });
  });
});
