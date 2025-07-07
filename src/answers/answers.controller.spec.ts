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

  describe("create", () => {
    const newAnswerDto = {
      userId: randomUUID(),
      questionId: randomUUID(),
      selectedOption: "A",
      textAnswer: "Texto de exemplo",
      isCorrect: true,
      timeSpentSeconds: 45,
    };

    it("deve lançar erro 400 se DTO for inválido", async () => {
      const invalidDto = {
        ...newAnswerDto,
        userId: "not-a-uuid",
      };

      const req = makeMockRequest("ADMIN", randomUUID());

      await expect(controller.create(invalidDto, req)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("deve criar uma resposta como ADMIN para qualquer usuário", async () => {
      const req = makeMockRequest("ADMIN", randomUUID());
      mockAnswersService.create.mockResolvedValue({
        id: "resposta-id",
        ...newAnswerDto,
      });

      const result = await controller.create(newAnswerDto, req);

      expect(result).toMatchObject({
        id: "resposta-id",
        userId: newAnswerDto.userId,
      });
      expect(mockAnswersService.create).toHaveBeenCalledWith(newAnswerDto);
    });

    it("deve criar uma resposta como STUDENT para si mesmo", async () => {
      const req = makeMockRequest("STUDENT", newAnswerDto.userId);
      mockAnswersService.create.mockResolvedValue({
        id: "resposta-id",
        ...newAnswerDto,
      });

      const result = await controller.create(newAnswerDto, req);

      expect(result).toHaveProperty("id", "resposta-id");
      expect(mockAnswersService.create).toHaveBeenCalledWith(newAnswerDto);
    });

    it("deve lançar erro 403 se STUDENT tentar responder por outro usuário", async () => {
      const anotherUserId = randomUUID();
      const req = makeMockRequest("STUDENT", anotherUserId);

      await expect(controller.create(newAnswerDto, req)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("deve lançar erro 400 se DTO for inválido", async () => {
      const invalidDto = {
        ...newAnswerDto,
        userId: "not-a-uuid",
      };

      const req = makeMockRequest("ADMIN", randomUUID());

      await expect(controller.create(invalidDto, req)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("deve lançar erro 403 se não autenticado", async () => {
      const req = { user: null } as unknown as AuthenticatedRequest;

      await expect(controller.create(newAnswerDto, req)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

});

