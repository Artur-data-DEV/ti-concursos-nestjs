import { adminReq, studentReq } from '../__mocks__/user_mocks';
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { AnswersService } from './answers.service';
import { AnswersController } from './answers.controller';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateAnswerDto } from './dto/create-answer.dto';

describe('AnswersController', () => {
  let controller: AnswersController;

  const mockAnswersService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnswersController],
      providers: [
        {
          provide: AnswersService,
          useValue: mockAnswersService,
        },
      ],
    }).compile();

    controller = module.get<AnswersController>(AnswersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const newAnswerDto = {
      userId: randomUUID(),
      questionId: randomUUID(),
      selectedOption: 'A',
      textAnswer: 'Texto de exemplo',
      isCorrect: true,
      timeSpentSeconds: 45,
    };

    it('deve lançar erro 400 se DTO for inválido', () => {
      const invalidDto = {
        ...newAnswerDto,
        userId: 'not-a-uuid',
      };

      const dtoInstance = plainToInstance(CreateAnswerDto, invalidDto);
      const errors = validateSync(dtoInstance);
      // espera que haja erro
      expect(errors.length).toBeGreaterThan(0);

      // e que esse erro seja na propriedade userId
      expect(errors[0].property).toBe('userId');

      // e que a constraint seja 'isUuid'
      expect(errors[0].constraints).toHaveProperty('isUuid');

      // opcional: checar a mensagem personalizada
      expect(errors[0].constraints?.isUuid).toBe(
        'O ID do usuário deve ser um UUID válido.',
      );
    });

    it('deve lançar erro 403 se não autenticado', async () => {
      const req = { user: null } as unknown as AuthenticatedRequest;

      await expect(controller.create(newAnswerDto, req)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve lançar erro 403 se STUDENT tentar responder por outro usuário', async () => {
      await expect(
        controller.create(newAnswerDto, {
          user: { sub: randomUUID(), role: 'STUDENT' },
        } as AuthenticatedRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve criar uma resposta como ADMIN para qualquer usuário', async () => {
      mockAnswersService.create.mockResolvedValue({
        id: 'resposta-id',
        ...newAnswerDto,
      });

      const result = await controller.create(newAnswerDto, adminReq);

      expect(result).toMatchObject({
        id: 'resposta-id',
        userId: newAnswerDto.userId,
      });
      expect(mockAnswersService.create).toHaveBeenCalledWith(newAnswerDto);
    });

    it('deve criar uma resposta como STUDENT para si mesmo', async () => {
      const dto = { ...newAnswerDto, userId: studentReq.user.sub };

      mockAnswersService.create.mockResolvedValue({
        id: 'resposta-id',
        ...dto,
      });

      const result = await controller.create(dto, studentReq);

      expect(result).toHaveProperty('id', 'resposta-id');
      expect(mockAnswersService.create).toHaveBeenCalledWith(dto);
    });
  });
});
