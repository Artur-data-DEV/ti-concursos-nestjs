import { Test, TestingModule } from '@nestjs/testing';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('LessonsController', () => {
  let controller: LessonsController;
  let service: LessonsService;

  const mockLessonId = randomUUID();
  const mockModuleId = randomUUID();
  const mockAdminId = randomUUID();
  const mockProfessorId = randomUUID();
  const mockStudentId = randomUUID();

  const mockLesson = {
    id: mockLessonId,
    title: 'Test Lesson',
    content: 'This is a test lesson content.',
    moduleId: mockModuleId,
    order: 1,
  };

  const mockPrismaService = {
    lesson: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    module: {
      findUnique: jest.fn(),
    },
  };

  const mockAuthenticatedAdminRequest: AuthenticatedRequest = {
    user: {
      sub: mockAdminId,
      role: 'ADMIN',
    },
  } as AuthenticatedRequest;

  const mockAuthenticatedProfessorRequest: AuthenticatedRequest = {
    user: {
      sub: mockProfessorId,
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
      controllers: [LessonsController],
      providers: [
        LessonsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<LessonsController>(LessonsController);
    service = module.get<LessonsService>(LessonsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of lessons for any authenticated user', async () => {
      mockPrismaService.lesson.findMany.mockResolvedValue([mockLesson]);

      const result = await controller.findAll();

      expect(result).toEqual([mockLesson]);
      expect(mockPrismaService.lesson.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return lesson by ID for any authenticated user', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(mockLesson);

      const result = await controller.findOne(mockLessonId);

      expect(result).toEqual(mockLesson);
      expect(mockPrismaService.lesson.findUnique).toHaveBeenCalledWith({
        where: { id: mockLessonId },
      });
    });

    it('should throw BadRequestException for invalid lesson ID', async () => {
      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when lesson not found', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(null);

      await expect(controller.findOne(randomUUID())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.lesson.findMany.mockResolvedValue([]);

      const filters = {
        moduleId: randomUUID(),
        limit: '10',
        offset: '0',
      };

      await controller.findAll();

      expect(mockPrismaService.lesson.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            moduleId: filters.moduleId,
          },
          take: 10,
          skip: 0,
        }),
      );
    });
  });

  describe('create', () => {
    const createLessonDto = {
      title: 'New Lesson',
      content: 'Content of new lesson',
      moduleId: mockModuleId,
      order: 2,
    };

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { ...createLessonDto, title: '' };
      await expect(
        controller.create(invalidDto, mockAuthenticatedAdminRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      await expect(
        controller.create(createLessonDto, mockAuthenticatedStudentRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create lesson for ADMIN', async () => {
      const createdLesson = { id: randomUUID(), ...createLessonDto };
      mockPrismaService.module.findUnique.mockResolvedValue({
        id: mockModuleId,
      });
      mockPrismaService.lesson.create.mockResolvedValue(createdLesson);

      const result = await controller.create(
        createLessonDto,
        mockAuthenticatedAdminRequest,
      );

      expect(result).toEqual(createdLesson);
      expect(mockPrismaService.lesson.create).toHaveBeenCalledWith({
        data: createLessonDto,
      });
    });

    it('should create lesson for PROFESSOR', async () => {
      const createdLesson = { id: randomUUID(), ...createLessonDto };
      mockPrismaService.module.findUnique.mockResolvedValue({
        id: mockModuleId,
      });
      mockPrismaService.lesson.create.mockResolvedValue(createdLesson);

      const result = await controller.create(
        createLessonDto,
        mockAuthenticatedProfessorRequest,
      );

      expect(result).toEqual(createdLesson);
      expect(mockPrismaService.lesson.create).toHaveBeenCalledWith({
        data: createLessonDto,
      });
    });

    it('should throw NotFoundException if module not found', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(null);

      await expect(controller.create(createLessonDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Lesson' };

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(
        controller.update(
          'invalid-id',
          updateDto,
          mockAuthenticatedAdminRequest,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { title: '' };
      await expect(
        controller.update(
          mockLessonId,
          invalidDto,
          mockAuthenticatedAdminRequest,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(mockLesson);

      await expect(
        controller.update(
          mockLessonId,
          updateDto,
          mockAuthenticatedStudentRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update lesson for ADMIN', async () => {
      const updatedLesson = { ...mockLesson, ...updateDto };
      mockPrismaService.lesson.findUnique.mockResolvedValue(mockLesson);
      mockPrismaService.lesson.update.mockResolvedValue(updatedLesson);

      const result = await controller.update(
        mockLessonId,
        updateDto,
        mockAuthenticatedAdminRequest,
      );

      expect(result).toEqual(updatedLesson);
      expect(mockPrismaService.lesson.update).toHaveBeenCalledWith({
        where: { id: mockLessonId },
        data: updateDto,
      });
    });

    it('should update lesson for PROFESSOR', async () => {
      const updatedLesson = { ...mockLesson, ...updateDto };
      mockPrismaService.lesson.findUnique.mockResolvedValue(mockLesson);
      mockPrismaService.lesson.update.mockResolvedValue(updatedLesson);

      const result = await controller.update(
        mockLessonId,
        updateDto,
        mockAuthenticatedProfessorRequest,
      );

      expect(result).toEqual(updatedLesson);
      expect(mockPrismaService.lesson.update).toHaveBeenCalledWith({
        where: { id: mockLessonId },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when lesson not found', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(null);

      await expect(
        controller.update(
          randomUUID(),
          updateDto,
          mockAuthenticatedAdminRequest,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException for invalid ID', async () => {
      await expect(
        controller.remove('invalid-id', mockAuthenticatedAdminRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(mockLesson);

      await expect(
        controller.remove(mockLessonId, mockAuthenticatedStudentRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when lesson not found', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(null);

      await expect(
        controller.remove(randomUUID(), mockAuthenticatedAdminRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete lesson for ADMIN', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(mockLesson);
      mockPrismaService.lesson.delete.mockResolvedValue(mockLesson);

      const result = await controller.remove(
        mockLessonId,
        mockAuthenticatedAdminRequest,
      );

      expect(result).toEqual({ message: 'Lesson deleted' });
      expect(mockPrismaService.lesson.delete).toHaveBeenCalledWith({
        where: { id: mockLessonId },
      });
    });

    it('should delete lesson for PROFESSOR', async () => {
      mockPrismaService.lesson.findUnique.mockResolvedValue(mockLesson);
      mockPrismaService.lesson.delete.mockResolvedValue(mockLesson);

      const result = await controller.remove(
        mockLessonId,
        mockAuthenticatedProfessorRequest,
      );

      expect(result).toEqual({ message: 'Lesson deleted' });
      expect(mockPrismaService.lesson.delete).toHaveBeenCalledWith({
        where: { id: mockLessonId },
      });
    });
  });
});
