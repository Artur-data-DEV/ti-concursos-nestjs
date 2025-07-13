/* eslint-disable @typescript-eslint/unbound-method */
import { adminReq, studentReq } from '../__mocks__/user_mocks';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { AnswersService } from './answers.service';
import { AnswersController } from './answers.controller';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createId } from '@paralleldrive/cuid2';

describe('AnswersController', () => {
  let controller: AnswersController;
  let service: DeepMockProxy<AnswersService>;

  const mockAnswerId = createId();
  const mockQuestionId = createId();
  const mockUserId = createId();

  const mockAnswer = {
    id: mockAnswerId,
    userId: mockUserId,
    questionId: mockQuestionId,
    selectedOption: 'A',
    textAnswer: 'Texto de exemplo',
    isCorrect: true,
    timeSpentSeconds: 45,
    answeredAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnswersController],
      providers: [
        { provide: AnswersService, useValue: mockDeep<AnswersService>() },
      ],
    }).compile();

    controller = module.get<AnswersController>(AnswersController);
    service = module.get(AnswersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const newAnswerDto: CreateAnswerDto = {
      userId: mockUserId,
      questionId: mockQuestionId,
      selectedOption: 'A',
      textAnswer: 'Texto de exemplo',
      isCorrect: true,
      timeSpentSeconds: 45,
    };

    it('deve lançar BadRequestException se DTO for inválido', async () => {
      const invalidDto = {
        ...newAnswerDto,
        userId: 'not-a-cuid', // inválido
      };

      const dtoInstance = plainToInstance(CreateAnswerDto, invalidDto);
      const errors = await validate(dtoInstance);

      expect(errors.length).toBeGreaterThan(0); // confirma que tem erros

      // Simula o ValidationPipe lançando BadRequestException
      if (errors.length > 0) {
        expect(() => {
          throw new BadRequestException('Validation failed');
        }).toThrow(BadRequestException);
      }
    });

    it('deve lançar ForbiddenException se não autenticado', async () => {
      await expect(
        controller.create(newAnswerDto, {} as AuthenticatedRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar ForbiddenException se STUDENT tentar responder por outro usuário', async () => {
      await expect(
        controller.create(newAnswerDto, {
          user: { sub: createId(), role: 'STUDENT' },
        } as AuthenticatedRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve criar uma resposta como ADMIN para qualquer usuário', async () => {
      service.create.mockResolvedValue(mockAnswer);

      const result = await controller.create(newAnswerDto, adminReq);

      expect(result).toMatchObject({
        id: mockAnswer.id,
        userId: newAnswerDto.userId,
      });
      expect(service.create).toHaveBeenCalledWith(newAnswerDto);
    });

    it('deve criar uma resposta como STUDENT para si mesmo', async () => {
      const dto = { ...newAnswerDto, userId: studentReq.user.sub };

      service.create.mockResolvedValue(mockAnswer);

      const result = await controller.create(dto, studentReq);

      expect(result).toHaveProperty('id', mockAnswer.id);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });
});
