/* eslint-disable @typescript-eslint/unbound-method */
import {
  adminId,
  adminReq,
  studentId,
  studentReq,
} from '../__mocks__/user_mocks';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AnswerAttemptsController } from './answer-attempts.controller';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { AnswerAttemptsService } from './answer-attempts.service';
import { CreateAnswerAttemptDto } from './dto/create-answer-attempt.dto';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { UpdateAnswerAttemptDto } from './dto/update-answer-attempt.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createId } from '@paralleldrive/cuid2';

describe('AnswerAttemptsController', () => {
  let controller: AnswerAttemptsController;
  let service: DeepMockProxy<AnswerAttemptsService>;

  // IDs de exemplo para mocks
  const questionId = createId();
  const attemptId = createId();
  const answerId = createId();

  // Mock de tentativa de resposta com estrutura compatível com seu service
  const mockAnswerAttempt = {
    id: attemptId,
    answerId,
    isCorrect: false,
    timeSpent: 120,
    attemptAt: new Date(),
    answer: {
      id: createId(),
      isCorrect: null,
      userId: studentId,
      questionId,
      selectedOption: null,
      textAnswer: null,
      timeSpentSeconds: 60,
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
        controller.findAll(studentReq, { userId: createId() }),
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

    it('should validate successfully with correct data', async () => {
      const dto = plainToInstance(CreateAnswerAttemptDto, {
        // preencha com dados válidos
        answerId: createId(),
        isCorrect: true,
        timeSpentSeconds: 120,
        attemptAt: new Date(),
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0); // nenhum erro de validação
    });

    it('should fail validation with invalid data', async () => {
      const dto = plainToInstance(CreateAnswerAttemptDto, {
        answerId: 'invalid-uuid',
        isCorrect: 'not-a-boolean',
        timeSpentSeconds: -5,
        attemptAt: 'invalid-date',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0); // espera erros
    });

    it('deve lançar ForbiddenException se não autenticado', async () => {
      await expect(
        controller.create(newAttemptDto, {} as AuthenticatedRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve criar tentativa com sucesso', async () => {
      service.findAnswer.mockResolvedValue({ userId: adminId });
      service.create.mockResolvedValue(mockAnswerAttempt);

      const result = await controller.create(newAttemptDto, adminReq);

      expect(result).toEqual(mockAnswerAttempt);
    });

    it('deve lançar NotFoundException se resposta não existir', async () => {
      service.findAnswer.mockResolvedValue(null);

      await expect(controller.create(newAttemptDto, adminReq)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ForbiddenException para STUDENT criando tentativa de outro user', async () => {
      service.findAnswer.mockResolvedValue({ userId: 'outro-id' });

      await expect(
        controller.create(newAttemptDto, studentReq),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // --- update ---

  describe('update', () => {
    const updateDto: UpdateAnswerAttemptDto = {
      isCorrect: true,
      timeSpent: 80,
      attemptAt: new Date(),
    };

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
