import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

describe('QuestionsController', () => {
  let controller: QuestionsController;
  let service: QuestionsService;

  const mockQuestionsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [
        {
          provide: QuestionsService,
          useValue: mockQuestionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    controller = module.get<QuestionsController>(QuestionsController);
    service = module.get<QuestionsService>(QuestionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    const mockAdminId = randomUUID();
    const mockProfessorId = randomUUID();
    const mockStudentId = randomUUID();

    it('should return list of questions for authenticated user', async () => {
      const mockQuestions = [
        {
          id: randomUUID(),
          text: 'Test Question 1',
          difficulty: 'FACIL',
          questionType: 'MULTIPLA_ESCOLHA',
        },
        {
          id: randomUUID(),
          text: 'Test Question 2',
          difficulty: 'MEDIO',
          questionType: 'CERTO_ERRADO',
        },
      ];

      mockQuestionsService.findAll.mockResolvedValue(mockQuestions);

      const req = {
        user: { sub: mockStudentId, role: 'STUDENT' },
      };

      const result = await controller.findAll(req);

      expect(result).toEqual(mockQuestions);
      expect(mockQuestionsService.findAll).toHaveBeenCalled();
    });

    it('should return question by ID for authenticated user', async () => {
      const questionId = randomUUID();
      const mockQuestion = {
        id: questionId,
        text: 'Test Question',
        difficulty: 'FACIL',
        questionType: 'MULTIPLA_ESCOLHA',
        topic: { id: randomUUID(), name: 'Test Topic' },
        options: [
          { id: randomUUID(), text: 'Option 1', isCorrect: true },
          { id: randomUUID(), text: 'Option 2', isCorrect: false },
        ],
      };

      mockQuestionsService.findOne.mockResolvedValue(mockQuestion);

      const req = {
        user: { sub: mockStudentId, role: 'STUDENT' },
      };

      const result = await controller.findAll(req, questionId);

      expect(result).toEqual(mockQuestion);
      expect(mockQuestionsService.findOne).toHaveBeenCalledWith(
        questionId,
        true,
      );
    });

    it('should throw ForbiddenException for unauthenticated user', async () => {
      const req = {
        user: null,
      };

      await expect(controller.findAll(req)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid question ID', async () => {
      const req = {
        user: { sub: mockStudentId, role: 'STUDENT' },
      };

      await expect(controller.findAll(req, 'invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when question not found', async () => {
      const questionId = randomUUID();
      mockQuestionsService.findOne.mockResolvedValue(null);

      const req = {
        user: { sub: mockStudentId, role: 'STUDENT' },
      };

      await expect(controller.findAll(req, questionId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should apply filters when provided', async () => {
      const mockQuestions: any[] = [];
      mockQuestionsService.findAll.mockResolvedValue(mockQuestions);

      const req = {
        user: { sub: mockStudentId, role: 'STUDENT' },
      };

      const filters = {
        topicId: randomUUID(),
        difficulty: 'FACIL',
        limit: '10',
        offset: '0',
      };

      await controller.findAll(
        req,
        undefined,
        filters.topicId,
        undefined,
        undefined,
        undefined,
        undefined,
        filters.limit,
        filters.offset,
      );

      expect(mockQuestionsService.findAll).toHaveBeenCalledWith({
        topicId: filters.topicId,
        subtopicId: undefined,
        bancaId: undefined,
        technologyId: undefined,
        tagId: undefined,
        limit: filters.limit,
        offset: filters.offset,
      });
    });
  });

  describe('create', () => {
    const mockProfessorId = randomUUID();
    const mockAdminId = randomUUID();

    it('should create question for PROFESSOR', async () => {
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

      const createdQuestion = { id: randomUUID(), ...createQuestionDto };
      mockQuestionsService.create.mockResolvedValue(createdQuestion);

      const req = {
        user: { sub: mockProfessorId, role: 'PROFESSOR' },
      };

      const result = await controller.create(createQuestionDto, req);

      expect(result).toEqual(createdQuestion);
      expect(mockQuestionsService.create).toHaveBeenCalledWith(
        createQuestionDto,
        mockProfessorId,
      );
    });

    it('should create question for ADMIN', async () => {
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

      const createdQuestion = { id: randomUUID(), ...createQuestionDto };
      mockQuestionsService.create.mockResolvedValue(createdQuestion);

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      const result = await controller.create(createQuestionDto, req);

      expect(result).toEqual(createdQuestion);
      expect(mockQuestionsService.create).toHaveBeenCalledWith(
        createQuestionDto,
        mockAdminId,
      );
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = {
        text: '', // invalid - empty text
        difficulty: 'INVALID',
        questionType: 'INVALID',
      };

      const req = {
        user: { sub: mockProfessorId, role: 'PROFESSOR' },
      };

      await expect(controller.create(invalidDto, req)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    const mockProfessorId = randomUUID();
    const mockAdminId = randomUUID();
    const questionId = randomUUID();

    it('should update question for ADMIN', async () => {
      const updateDto = {
        text: 'Updated Question',
        difficulty: 'MEDIO',
      };

      const existingQuestion = {
        id: questionId,
        authorId: mockProfessorId,
      };

      const updatedQuestion = { ...existingQuestion, ...updateDto };

      mockQuestionsService.findOne.mockResolvedValue(existingQuestion);
      mockQuestionsService.update.mockResolvedValue(updatedQuestion);

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      const result: any = await controller.update(questionId, updateDto, req);

      expect(result).toEqual(updatedQuestion);
      expect(mockQuestionsService.update).toHaveBeenCalledWith(questionId, {
        ...updateDto,
        id: questionId,
      });
    });

    it('should update question for question author (PROFESSOR)', async () => {
      const updateDto = {
        text: 'Updated Question',
        difficulty: 'MEDIO',
      };

      const existingQuestion = {
        id: questionId,
        authorId: mockProfessorId,
      };

      const updatedQuestion = { ...existingQuestion, ...updateDto };

      mockQuestionsService.findOne.mockResolvedValue(existingQuestion);
      mockQuestionsService.update.mockResolvedValue(updatedQuestion);

      const req = {
        user: { sub: mockProfessorId, role: 'PROFESSOR' },
      };

      const result = await controller.update(questionId, updateDto, req);

      expect(result).toEqual(updatedQuestion);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = {
        difficulty: 'INVALID_DIFFICULTY',
      };

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      await expect(
        controller.update(questionId, invalidDto, req),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for PROFESSOR updating other author question', async () => {
      const updateDto = {
        text: 'Updated Question',
      };

      const existingQuestion = {
        id: questionId,
        authorId: randomUUID(), // different author
      };

      mockQuestionsService.findOne.mockResolvedValue(existingQuestion);

      const req = {
        user: { sub: mockProfessorId, role: 'PROFESSOR' },
      };

      await expect(
        controller.update(questionId, updateDto, req),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when question not found', async () => {
      const updateDto = {
        text: 'Updated Question',
      };

      mockQuestionsService.findOne.mockResolvedValue(null);

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      await expect(
        controller.update(questionId, updateDto, req),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    const mockAdminId = randomUUID();
    const mockProfessorId = randomUUID();
    const questionId = randomUUID();

    it('should delete question for ADMIN', async () => {
      const existingQuestion = {
        id: questionId,
        authorId: mockProfessorId,
      };

      mockQuestionsService.findOne.mockResolvedValue(existingQuestion);
      mockQuestionsService.remove.mockResolvedValue({ id: questionId });

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      const result = await controller.remove(questionId, req);

      expect(result).toEqual({ message: 'Question deleted' });
      expect(mockQuestionsService.remove).toHaveBeenCalledWith(questionId);
    });

    it('should delete question for question author', async () => {
      const existingQuestion = {
        id: questionId,
        authorId: mockProfessorId,
      };

      mockQuestionsService.findOne.mockResolvedValue(existingQuestion);
      mockQuestionsService.remove.mockResolvedValue({ id: questionId });

      const req = {
        user: { sub: mockProfessorId, role: 'PROFESSOR' },
      };

      const result = await controller.remove(questionId, req);

      expect(result).toEqual({ message: 'Question deleted' });
    });

    it('should throw BadRequestException for PROFESSOR deleting other author question', async () => {
      const existingQuestion = {
        id: questionId,
        authorId: randomUUID(), // different author
      };

      mockQuestionsService.findOne.mockResolvedValue(existingQuestion);

      const req = {
        user: { sub: mockProfessorId, role: 'PROFESSOR' },
      };

      await expect(controller.remove(questionId, req)).rejects.toThrow(
        ForbiddenException,
      );
    });
    it('should throw NotFoundException when question not found', async () => {
      mockQuestionsService.findOne.mockResolvedValue(null);

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      await expect(controller.remove(questionId, req)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid ID', async () => {
      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      await expect(controller.remove('invalid-id', req)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
