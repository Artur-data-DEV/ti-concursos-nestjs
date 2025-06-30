import { Test, TestingModule } from '@nestjs/testing';
import { AnswerAttemptsController } from './answer-attempts.controller';
import { AnswerAttemptsService } from './answer-attempts.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';

describe('AnswerAttemptsController', () => {
  let controller: AnswerAttemptsController;

  const userId = randomUUID();
  const questionId = randomUUID();
  const attemptId = randomUUID();
  const answerId = randomUUID();

  const mockAnswerAttempt = {
    id: attemptId,
    answerId,
    isCorrect: false,
    timeSpent: 120,
    attemptAt: new Date(),
    answer: {
      userId,
      questionId,
    },
  };

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

  const mockUserAdmin: AuthenticatedRequest = {
    user: {
      sub: randomUUID(),
      role: 'ADMIN',
    },
  } as AuthenticatedRequest;

  const mockUserStudent: AuthenticatedRequest = {
    user: {
      sub: userId, // igual ao da tentativa
      role: 'STUDENT',
    },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnswerAttemptsController],
      providers: [
        AnswerAttemptsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<AnswerAttemptsController>(AnswerAttemptsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /*** FIND ALL ***/
  describe('findAll', () => {
    it('deve retornar lista para ADMIN', async () => {
      mockPrismaService.answerAttempt.findMany.mockResolvedValue([
        mockAnswerAttempt,
      ]);

      const result = await controller.findAll(mockUserAdmin);

      expect(result).toEqual([mockAnswerAttempt]);
      expect(mockPrismaService.answerAttempt.findMany).toHaveBeenCalledTimes(1);
    });

    it('deve aplicar filtros e paginação para ADMIN', async () => {
      mockPrismaService.answerAttempt.findMany.mockResolvedValue([
        mockAnswerAttempt,
      ]);

      const result = await controller.findAll(
        mockUserAdmin,
        userId,
        questionId,
        'true',
        '10',
        '5',
      );

      expect(result).toEqual([mockAnswerAttempt]);
      expect(mockPrismaService.answerAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            answer: {
              userId,
              questionId,
            },
            isCorrect: true,
          },
          take: 10,
          skip: 5,
        }),
      );
    });

    it('deve retornar tentativas do próprio STUDENT', async () => {
      mockPrismaService.answerAttempt.findMany.mockResolvedValue([
        mockAnswerAttempt,
      ]);

      const result = await controller.findAll(mockUserStudent, userId);

      expect(result).toEqual([mockAnswerAttempt]);
      expect(mockPrismaService.answerAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            answer: {
              userId,
            },
          },
        }),
      );
    });

    it('deve lançar erro 403 para STUDENT acessando tentativas de outro user', async () => {
      await expect(
        controller.findAll(mockUserStudent, randomUUID()),
      ).rejects.toThrow('Não autorizado.');
    });
  });

  /*** CREATE ***/
  describe('create', () => {
    const newAttemptDto = {
      answerId,
      isCorrect: true,
      timeSpent: 60,
    };

    it('deve criar tentativa como ADMIN', async () => {
      mockPrismaService.answer.findUnique.mockResolvedValue({ userId });
      mockPrismaService.answerAttempt.create.mockResolvedValue({
        id: attemptId,
        ...newAttemptDto,
      });

      const result = await controller.create(newAttemptDto, mockUserAdmin);

      expect(result).toMatchObject({
        id: attemptId,
        answerId,
      });
    });

    it('deve criar tentativa como STUDENT para si mesmo', async () => {
      mockPrismaService.answer.findUnique.mockResolvedValue({ userId });
      mockPrismaService.answerAttempt.create.mockResolvedValue({
        id: attemptId,
        ...newAttemptDto,
      });

      const result = await controller.create(newAttemptDto, mockUserStudent);

      expect(result.answerId).toBe(answerId);
    });

    it('deve lançar erro se resposta não existe', async () => {
      mockPrismaService.answer.findUnique.mockResolvedValue(null);

      await expect(
        controller.create(newAttemptDto, mockUserAdmin),
      ).rejects.toThrow('Resposta não encontrada.');
    });

    it('deve lançar erro 403 para STUDENT criando de outro userId', async () => {
      mockPrismaService.answer.findUnique.mockResolvedValue({
        userId: 'outro-id',
      });

      await expect(
        controller.create(newAttemptDto, mockUserStudent),
      ).rejects.toThrow('Não autorizado.');
    });
  });

  /*** UPDATE ***/
  describe('update', () => {
    const updateDto = {
      id: attemptId,
      answerId,
      isCorrect: true,
      timeSpent: 80,
      attemptAt: new Date(),
    };

    it('deve atualizar como ADMIN', async () => {
      mockPrismaService.answerAttempt.findUnique.mockResolvedValue(
        mockAnswerAttempt,
      );
      mockPrismaService.answer.findUnique.mockResolvedValue({ userId });
      mockPrismaService.answerAttempt.update.mockResolvedValue(updateDto);

      const result = await controller.update(
        attemptId,
        updateDto,
        mockUserAdmin,
      );

      expect(result.isCorrect).toBe(true);
      expect(mockPrismaService.answerAttempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: attemptId },
          data: updateDto,
        }),
      );
    });

    it('deve lançar erro se tentativa não existe', async () => {
      mockPrismaService.answerAttempt.findUnique.mockResolvedValue(null);

      await expect(
        controller.update(attemptId, updateDto, mockUserAdmin),
      ).rejects.toThrow('Tentativa de resposta não encontrada.');
    });
  });

  /*** DELETE ***/
  describe('remove', () => {
    it('deve remover como ADMIN', async () => {
      mockPrismaService.answerAttempt.findUnique.mockResolvedValue(
        mockAnswerAttempt,
      );
      mockPrismaService.answerAttempt.delete.mockResolvedValue(
        mockAnswerAttempt,
      );

      const result = await controller.remove(attemptId, mockUserAdmin);

      expect(result).toEqual({
        message: 'Tentativa de resposta deletada com sucesso.',
      });
    });

    it('deve lançar erro se tentativa não existe', async () => {
      mockPrismaService.answerAttempt.findUnique.mockResolvedValue(null);

      await expect(controller.remove(attemptId, mockUserAdmin)).rejects.toThrow(
        'Tentativa de resposta não encontrada.',
      );
    });
  });
});
