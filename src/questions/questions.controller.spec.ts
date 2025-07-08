import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('QuestionsController', () => {
  let controller: QuestionsController;
  let service: DeepMockProxy<QuestionsService>;
  let prismaService: DeepMockProxy<PrismaService>;

  const mockQuestionId = randomUUID();
  const mockAuthorId = randomUUID();
  const mockAdminId = randomUUID();
  const mockStudentId = randomUUID();

  const mockQuestion = {
    id: mockQuestionId,
    text: 'Test Question',
    difficulty: 'FACIL',
    questionType: 'MULTIPLA_ESCOLHA',
    authorId: mockAuthorId,
    topic: { id: randomUUID(), name: 'Test Topic' },
    options: [
      { id: randomUUID(), text: 'Option 1', isCorrect: true, order: 1 },
      { id: randomUUID(), text: 'Option 2', isCorrect: false, order: 2 },
    ],
  };

  const mockAuthenticatedAdminRequest: AuthenticatedRequest = {
    user: {
      sub: mockAdminId,
      role: 'ADMIN',
    },
  } as AuthenticatedRequest;

  const mockAuthenticatedProfessorRequest: AuthenticatedRequest = {
    user: {
      sub: mockAuthorId,
      role: 'PROFESSOR',
    },
  } as AuthenticatedRequest;

  const mockAuthenticatedStudentRequest: AuthenticatedRequest = {
    user: {
      sub: mockStudentId,
      role: 'STUDENT',
    },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [
        { provide: QuestionsService, useValue: mockDeep<QuestionsService>() },
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    controller = module.get<QuestionsController>(QuestionsController);
    service = module.get(QuestionsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of questions for any authenticated user', async () => {
      service.findAll.mockResolvedValue([mockQuestion]);

      const result = await controller.findAll(mockAuthenticatedStudentRequest);

      expect(result).toEqual([mockQuestion]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return question by ID for any authenticated user', async () => {
      service.findOne.mockResolvedValue(mockQuestion);

      const result = await controller.findAll(
        mockAuthenticatedStudentRequest,
        mockQuestionId,
      );

      expect(result).toEqual(mockQuestion);
      expect(service.findOne).toHaveBeenCalledWith(mockQuestionId);
    });

    it('should throw BadRequestException for invalid question ID', async () => {
      await expect(
        controller.findAll(mockAuthenticatedStudentRequest, 'invalid-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when question not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(
        controller.findAll(mockAuthenticatedStudentRequest, randomUUID()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should apply filters when provided', async () => {
      service.findAll.mockResolvedValue([]);

      const filters = {
        topicId: randomUUID(),
        difficulty: 'FACIL',
        limit: '10',
        offset: '0',
      };

      await controller.findAll(
        mockAuthenticatedStudentRequest,
        undefined,
        filters.topicId,
        undefined,
        undefined,
        undefined,
        undefined,
        filters.limit,
        filters.offset,
      );

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          topicId: filters.topicId,
          difficulty: filters.difficulty,
          limit: parseInt(filters.limit),
          offset: parseInt(filters.offset),
        }),
      );
    });
  });

  describe('create', () => {
    const createQuestionDto = {
      text: 'New Question',
      difficulty: 'FACIL',
      questionType: 'MULTIPLA_ESCOLHA',
      topicId: randomUUID(),
      options: [
        { text: 'Option 1', isCorrect: true, order: 1 },
        { text: 'Option 2', isCorrect: false, order: 2 },
      ],
    };

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { ...createQuestionDto, text: '' };
      await expect(
        controller.create(invalidDto, mockAuthenticatedProfessorRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      await expect(
        controller.create(createQuestionDto, mockAuthenticatedStudentRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create question for PROFESSOR', async () => {
      const createdQuestion = {
        id: randomUUID(),
        ...createQuestionDto,
        authorId: mockAuthorId,
      };
      service.create.mockResolvedValue(createdQuestion);

      const result = await controller.create(
        createQuestionDto,
        mockAuthenticatedProfessorRequest,
      );

      expect(result).toEqual(createdQuestion);
      expect(service.create).toHaveBeenCalledWith({
        ...createQuestionDto,
        authorId: mockAuthorId,
      });
    });

    it('should create question for ADMIN', async () => {
      const createdQuestion = {
        id: randomUUID(),
        ...createQuestionDto,
        authorId: mockAdminId,
      };
      service.create.mockResolvedValue(createdQuestion);

      const result = await controller.create(
        createQuestionDto,
        mockAuthenticatedAdminRequest,
      );

      expect(result).toEqual(createdQuestion);
      expect(service.create).toHaveBeenCalledWith({
        ...createQuestionDto,
        authorId: mockAdminId,
      });
    });
  });

  describe('update', () => {
    const updateDto = { text: 'Updated Question' };

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(
        controller.update(
          'invalid-id',
          updateDto,
          mockAuthenticatedAdminRequest,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when question not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(
        controller.update(
          randomUUID(),
          updateDto,
          mockAuthenticatedAdminRequest,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for PROFESSOR updating other author question', async () => {
      const otherProfessorRequest = {
        user: { sub: randomUUID(), role: 'PROFESSOR' },
      } as AuthenticatedRequest;
      service.findOne.mockResolvedValue(mockQuestion);

      await expect(
        controller.update(mockQuestionId, updateDto, otherProfessorRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      service.findOne.mockResolvedValue(mockQuestion);

      await expect(
        controller.update(
          mockQuestionId,
          updateDto,
          mockAuthenticatedStudentRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update question for ADMIN', async () => {
      const updatedQuestion = { ...mockQuestion, ...updateDto };
      service.findOne.mockResolvedValue(mockQuestion);
      service.update.mockResolvedValue(updatedQuestion);

      const result = await controller.update(
        mockQuestionId,
        updateDto,
        mockAuthenticatedAdminRequest,
      );

      expect(result).toEqual(updatedQuestion);
      expect(service.update).toHaveBeenCalledWith(mockQuestionId, updateDto);
    });

    it('should update own question for PROFESSOR', async () => {
      const updatedQuestion = { ...mockQuestion, ...updateDto };
      service.findOne.mockResolvedValue(mockQuestion);
      service.update.mockResolvedValue(updatedQuestion);

      const result = await controller.update(
        mockQuestionId,
        updateDto,
        mockAuthenticatedProfessorRequest,
      );

      expect(result).toEqual(updatedQuestion);
      expect(service.update).toHaveBeenCalledWith(mockQuestionId, updateDto);
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException for invalid ID', async () => {
      await expect(
        controller.remove('invalid-id', mockAuthenticatedAdminRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when question not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(
        controller.remove(randomUUID(), mockAuthenticatedAdminRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for PROFESSOR deleting other author question', async () => {
      const otherProfessorRequest = {
        user: { sub: randomUUID(), role: 'PROFESSOR' },
      } as AuthenticatedRequest;
      service.findOne.mockResolvedValue(mockQuestion);

      await expect(
        controller.remove(mockQuestionId, otherProfessorRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      service.findOne.mockResolvedValue(mockQuestion);

      await expect(
        controller.remove(mockQuestionId, mockAuthenticatedStudentRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete question for ADMIN', async () => {
      service.findOne.mockResolvedValue(mockQuestion);
      service.remove.mockResolvedValue(mockQuestion);

      const result = await controller.remove(
        mockQuestionId,
        mockAuthenticatedAdminRequest,
      );

      expect(result).toEqual({ message: 'Question deleted' });
      expect(service.remove).toHaveBeenCalledWith(mockQuestionId);
    });

    it('should delete own question for PROFESSOR', async () => {
      service.findOne.mockResolvedValue(mockQuestion);
      service.remove.mockResolvedValue(mockQuestion);

      const result = await controller.remove(
        mockQuestionId,
        mockAuthenticatedProfessorRequest,
      );

      expect(result).toEqual({ message: 'Question deleted' });
      expect(service.remove).toHaveBeenCalledWith(mockQuestionId);
    });
  });
});


