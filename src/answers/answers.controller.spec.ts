import { Test, TestingModule } from '@nestjs/testing';

import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { AnswersService } from './answers.service';
import { AnswersController } from './answers.controller';

describe('AnswersController', () => {
  let controller: AnswersController;
  let answersService: AnswersService;

  const mockAnswersService = {
    create: jest.fn(),
  };

  const validDto = {
    userId: randomUUID(),
    questionId: randomUUID(),
    selectedOption: 'A',
    textAnswer: 'Texto de exemplo',
    isCorrect: true,
    timeSpentSeconds: 45,
  };

  const makeMockRequest = (role: string, sub: string): AuthenticatedRequest =>
    ({
      user: {
        sub,
        role,
      },
    }) as AuthenticatedRequest;

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
    answersService = module.get<AnswersService>(AnswersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /*** TESTES ***/
  it('deve criar uma resposta como ADMIN para qualquer usuário', async () => {
    const req = makeMockRequest('ADMIN', randomUUID());
    mockAnswersService.create.mockResolvedValue({
      id: 'resposta-id',
      ...validDto,
    });

    const result = await controller.create(validDto, req);

    expect(result).toMatchObject({
      id: 'resposta-id',
      userId: validDto.userId,
    });
    expect(() => answersService.create(validDto)).not.toThrow();
  });

  it('deve criar uma resposta como STUDENT para si mesmo', async () => {
    const req = makeMockRequest('STUDENT', validDto.userId);
    mockAnswersService.create.mockResolvedValue({
      id: 'resposta-id',
      ...validDto,
    });

    const result = await controller.create(validDto, req);

    expect(result).toHaveProperty('id', 'resposta-id');
    expect(() => answersService.create(validDto)).not.toThrow();
  });

  it('deve lançar erro 403 se STUDENT tentar responder por outro usuário', async () => {
    const anotherUserId = randomUUID();
    const req = makeMockRequest('STUDENT', anotherUserId);

    await expect(controller.create(validDto, req)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('deve lançar erro 400 se DTO for inválido', async () => {
    const invalidDto = {
      ...validDto,
      userId: 'not-a-uuid',
    };

    const req = makeMockRequest('ADMIN', randomUUID());

    await expect(controller.create(invalidDto, req)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve lançar erro 403 se não autenticado', async () => {
    const req = { user: null } as unknown as AuthenticatedRequest;

    await expect(controller.create(validDto, req)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
