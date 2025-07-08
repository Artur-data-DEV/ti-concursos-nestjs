/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AnswerAttemptsService } from './answer-attempts.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { randomUUID } from 'crypto';
import { AttemptFilterDto } from './dto/answer-attempts-filters.dto';

describe('AnswerAttemptsService', () => {
  let service: AnswerAttemptsService;
  let prisma: DeepMockProxy<PrismaService>;

  const attemptId = randomUUID();
  const answerId = randomUUID();
  const userId = randomUUID();

  const mockAttempt = {
    id: attemptId,
    answerId,
    isCorrect: true,
    timeSpent: 60,
    attemptAt: new Date('2023-01-01T00:00:00Z'),
    answer: {
      userId,
      questionId: 'question-id',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnswerAttemptsService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get<AnswerAttemptsService>(AnswerAttemptsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve retornar resultados com todos os filtros aplicados', async () => {
      prisma.answerAttempt.findMany.mockResolvedValue([mockAttempt]);

      const filters: AttemptFilterDto = {
        userId,
        questionId: 'question-id',
        isCorrect: 'true',
        limit: 5,
        offset: 0,
      };

      const result = await service.findAll(filters);

      expect(prisma.answerAttempt.findMany).toHaveBeenCalledWith({
        where: {
          answer: {
            userId,
            questionId: 'question-id',
          },
          isCorrect: true,
        },
        include: { answer: true },
        take: 5,
        skip: 0,
        orderBy: { attemptAt: 'desc' },
      });

      expect(result).toEqual([mockAttempt]);
    });

    it('deve funcionar com filtros parciais', async () => {
      prisma.answerAttempt.findMany.mockResolvedValue([mockAttempt]);

      const filters: AttemptFilterDto = {
        userId,
      };

      const result = await service.findAll(filters);

      expect(prisma.answerAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            answer: { userId },
          },
        }),
      );

      expect(result).toEqual([mockAttempt]);
    });
  });

  describe('findOne', () => {
    it('deve retornar tentativa existente', async () => {
      prisma.answerAttempt.findUnique.mockResolvedValue(mockAttempt);

      const result = await service.findOne(attemptId);

      expect(prisma.answerAttempt.findUnique).toHaveBeenCalledWith({
        where: { id: attemptId },
        include: { answer: { select: { userId: true } } },
      });

      expect(result).toEqual(mockAttempt);
    });

    it('deve retornar null se tentativa não existir', async () => {
      prisma.answerAttempt.findUnique.mockResolvedValue(null);

      const result = await service.findOne('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findAnswer', () => {
    it('deve retornar usuário da resposta', async () => {
      // Criando o mock manualmente com a estrutura necessária
      const mockAnswer = {
        id: '96bd9465-06d1-4ba0-b820-1393324537f2', // Gerar ID único
        userId: 'some-user-id', // Propriedade que você já tinha
        questionId: 'some-question-id', // Adicionando questionId
        selectedOption: null, // Adicionando selectedOption
        textAnswer: null, // Adicionando textAnswer
        isCorrect: null, // Adicionando isCorrect
        timeSpentSeconds: null, // Adicionando timeSpentSeconds
        answeredAt: new Date(), // Adicionando answeredAt
      };
      prisma.answer.findUnique.mockResolvedValue(mockAnswer);

      const result = await service.findAnswer(
        '96bd9465-06d1-4ba0-b820-1393324537f2',
      );

      expect(prisma.answer.findUnique).toHaveBeenCalledWith({
        where: { id: '96bd9465-06d1-4ba0-b820-1393324537f2' },
        select: { userId: true },
      });

      // Verificando o valor esperado
      expect(result).toEqual(mockAnswer);
    });
  });

  describe('create', () => {
    it('deve criar tentativa com timeSpent definido', async () => {
      const dto = {
        answerId,
        isCorrect: true,
        timeSpent: 90,
      };

      const createdAttempt = {
        id: randomUUID(),
        answerId: dto.answerId,
        isCorrect: dto.isCorrect,
        timeSpent: dto.timeSpent,
        attemptAt: expect.any(Date) as Date,
      };

      prisma.answerAttempt.create.mockResolvedValue(createdAttempt);

      const result = await service.create(dto);

      expect(prisma.answerAttempt.create).toHaveBeenCalledWith({
        data: {
          answerId: dto.answerId,
          isCorrect: dto.isCorrect,
          timeSpent: dto.timeSpent,
          attemptAt: expect.any(Date) as Date,
        },
      });

      expect(result).toEqual(createdAttempt);
    });

    it('deve criar tentativa com timeSpent como null', async () => {
      const dto = {
        answerId,
        isCorrect: false,
      };

      const createdAttempt = {
        id: randomUUID(),
        answerId: dto.answerId,
        isCorrect: dto.isCorrect,
        timeSpent: null,
        attemptAt: expect.any(Date) as Date,
      };

      prisma.answerAttempt.create.mockResolvedValue(createdAttempt);

      const result = await service.create(dto);

      expect(prisma.answerAttempt.create).toHaveBeenCalledWith({
        data: {
          answerId: dto.answerId,
          isCorrect: dto.isCorrect,
          timeSpent: null,
          attemptAt: expect.any(Date) as Date,
        },
      });

      expect(result).toEqual(createdAttempt);
    });
  });

  describe('update', () => {
    it('deve atualizar tentativa existente', async () => {
      const updateDto = { isCorrect: false };

      prisma.answerAttempt.update.mockResolvedValue({
        ...mockAttempt,
        ...updateDto,
      });

      const result = await service.update(attemptId, updateDto);

      expect(prisma.answerAttempt.update).toHaveBeenCalledWith({
        where: { id: attemptId },
        data: updateDto,
      });

      expect(result).toEqual({
        ...mockAttempt,
        ...updateDto,
      });
    });

    it('deve lançar erro se tentativa não for encontrada', async () => {
      prisma.answerAttempt.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Not found', {
          code: 'P2025',
          clientVersion: 'x',
        }),
      );

      await expect(
        service.update('invalid-id', { isCorrect: true }),
      ).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('deve remover tentativa existente', async () => {
      prisma.answerAttempt.delete.mockResolvedValue(mockAttempt);

      const result = await service.remove(attemptId);

      expect(prisma.answerAttempt.delete).toHaveBeenCalledWith({
        where: { id: attemptId },
      });

      expect(result).toEqual(mockAttempt);
    });

    it('deve lançar erro se tentativa não for encontrada', async () => {
      prisma.answerAttempt.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Not found', {
          code: 'P2025',
          clientVersion: 'x',
        }),
      );

      await expect(service.remove('invalid-id')).rejects.toThrow();
    });
  });
});
