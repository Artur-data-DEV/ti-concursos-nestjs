/* eslint-disable @typescript-eslint/unbound-method */
import {
  adminId,
  adminReq,
  studentId,
  studentReq,
} from '../__mocks__/user_mocks';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { AnswerAttemptsController } from './answer-attempts.controller';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { AnswerAttemptsService } from './answer-attempts.service';
import {
  CreateAnswerAttemptDto,
  UpdateAnswerAttemptDto,
} from './answer-attempts.dto';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('AnswerAttemptsController', () => {
  let controller: AnswerAttemptsController;
  let service: DeepMockProxy<AnswerAttemptsService>;

  // IDs de exemplo para mocks
  const questionId = randomUUID();
  const attemptId = randomUUID();
  const answerId = randomUUID();

  // Mock de tentativa de resposta com estrutura compatível com seu service
  const mockAnswerAttempt = {
    id: attemptId,
    answerId,
    isCorrect: false,
    timeSpent: 120,
    attemptAt: new Date(),
    answer: {
      id: randomUUID(),
      isCorrect: null,
      userId: studentId,
      questionId,
      selectedOption: null,
      textAnswer: null,
      timeSpentSeconds: null,
      answeredAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnswerAttemptsController],
      providers: [
        {
          provide: AnswerAttemptsService,
          useValue: mockDeep<AnswerAttemptsService>(),
        },
      ],
    }).compile();

    controller = module.get<AnswerAttemptsController>(AnswerAttemptsController);
    service = module.get(AnswerAttemptsService);
  });

  afterEach(() => jest.clearAllMocks());

  // --- findAll ---

  describe('findAll', () => {
    it('deve retornar lista para ADMIN', async () => {
      service.findAll.mockResolvedValue([mockAnswerAttempt]);

      const result = await controller.findAll(adminReq, {});

      expect(result).toEqual([mockAnswerAttempt]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('deve lançar ForbiddenException para STUDENT acessando tentativas de outro user', async () => {
      await expect(
        controller.findAll(studentReq, { userId: randomUUID() }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // --- create ---

  describe('create', () => {
    const newAttemptDto: CreateAnswerAttemptDto = {
      answerId,
      isCorrect: true,
      timeSpent: 60,
      attemptAt: new Date(),
    };

    it('deve lançar BadRequestException se dados inválidos', async () => {
      const invalidDto = {} as CreateAnswerAttemptDto;

      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      await expect(
        pipe.transform(invalidDto, {
          type: 'body',
          metatype: CreateAnswerAttemptDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar ForbiddenException se não autenticado', async () => {
      await expect(
        controller.create(newAttemptDto, {} as AuthenticatedRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar ForbiddenException para STUDENT criando tentativa de outro user', async () => {
      service.findAnswer.mockResolvedValue({ userId: 'outro-id' });

      await expect(
        controller.create(newAttemptDto, studentReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve criar tentativa com sucesso', async () => {
      service.findAnswer.mockResolvedValue({ userId: adminId });
      service.create.mockResolvedValue(mockAnswerAttempt);

      const result = await controller.create(newAttemptDto, adminReq);

      expect(result).toEqual(mockAnswerAttempt);
    });
  });

  // --- update ---

  describe('update', () => {
    const updateDto: UpdateAnswerAttemptDto = {
      id: attemptId,
      answerId,
      isCorrect: true,
      timeSpent: 80,
      attemptAt: new Date(),
    };

    it('deve lançar BadRequestException se id da rota e do DTO forem diferentes', async () => {
      await expect(
        controller.update(randomUUID(), updateDto, adminReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar ForbiddenException se não autenticado', async () => {
      await expect(
        controller.update(attemptId, updateDto, {} as AuthenticatedRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve atualizar com sucesso', async () => {
      service.findOne.mockResolvedValue(mockAnswerAttempt);
      service.update.mockResolvedValue({
        ...mockAnswerAttempt,
        isCorrect: true,
      });

      const result = await controller.update(attemptId, updateDto, adminReq);

      expect(result.isCorrect).toBe(true);
    });

    it('deve lançar NotFoundException se tentativa não existir', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(
        controller.update(attemptId, updateDto, adminReq),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- remove ---

  describe('remove', () => {
    it('deve lançar BadRequestException se ID inválido', async () => {
      const pipe = new ParseUUIDPipe();

      // Testa o pipe isoladamente, pois ele é executado na camada HTTP, antes do controller
      await expect(
        pipe.transform('invalid-uuid', { type: 'param', data: '' }),
      ).rejects.toThrow(BadRequestException);

      // No teste unitário do controller, a validação do pipe não é executada
      // Para testar o pipe integrado, faça testes e2e (integração)
    });

    it('deve lançar ForbiddenException se não autenticado', async () => {
      await expect(
        controller.remove(attemptId, {} as AuthenticatedRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve remover com sucesso', async () => {
      service.findOne.mockResolvedValue(mockAnswerAttempt);
      service.remove.mockResolvedValue(mockAnswerAttempt);

      const response = await controller.remove(attemptId, adminReq);

      expect(response).toEqual({
        message: 'Tentativa de resposta deletada com sucesso.',
      });
    });

    it('deve lançar NotFoundException se tentativa não existir', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.remove(attemptId, adminReq)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
