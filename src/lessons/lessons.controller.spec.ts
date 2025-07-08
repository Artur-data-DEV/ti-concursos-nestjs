/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { ModulesService } from '../modules/modules.service';
import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { adminReq, professorReq, studentReq } from '../__mocks__/user_mocks';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { Lesson, Module } from '@prisma/client';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';

describe('LessonsController', () => {
  let controller: LessonsController;
  let service: DeepMockProxy<LessonsService>;
  let moduleService: DeepMockProxy<ModulesService>;

  const mockLessonId = randomUUID();
  const mockModuleId = randomUUID();
  const mockCourseId = randomUUID();

  const mockLesson: Lesson = {
    id: mockLessonId,
    title: 'Test Lesson',
    content: 'This is a test lesson content.',
    moduleId: mockModuleId,
    duration: 10,
    lessonType: 'EXERCISE',
    videoUrl: 'https://example.com',
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonsController],
      providers: [
        { provide: LessonsService, useValue: mockDeep<LessonsService>() },
        { provide: ModulesService, useValue: mockDeep<ModulesService>() },
      ],
    }).compile();

    controller = module.get(LessonsController);
    service = module.get(LessonsService);
    moduleService = module.get(ModulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all lessons for student with courseId', async () => {
      // STUDENT deve passar courseId via req.query.courseId para passar na controller
      service.findOne.mockResolvedValue(mockLesson);

      // Mock para findAvailableLessonsForStudent
      service.findAvailableLessonsForStudent.mockResolvedValue([mockLesson]);

      const result = await controller.findAll(studentReq, mockCourseId);

      expect(result).toEqual([mockLesson]);
      expect(service.findAvailableLessonsForStudent).toHaveBeenCalledWith(
        studentReq.user.sub,
        mockCourseId,
      );
    });

    it('throws BadRequestException for student without courseId', async () => {
      await expect(controller.findAll(studentReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns all lessons for admin ignoring courseId', async () => {
      service.findAll.mockResolvedValue([mockLesson]);
      const adminReqWithQuery = {
        ...adminReq,
        query: {},
      } as unknown as AuthenticatedRequest;
      const result = await controller.findAll(adminReqWithQuery);
      expect(result).toEqual([mockLesson]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws BadRequestException on invalid UUID', async () => {
      const pipe = new ParseUUIDPipe();

      await expect(
        pipe.transform('invalid-uuid', { type: 'param', metatype: String }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if not found', async () => {
      service.findOne.mockResolvedValue(null);
      await expect(
        controller.findOne(mockLessonId, studentReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if student lacks access', async () => {
      service.findOne.mockResolvedValue(mockLesson);
      service.studentHasAccessToLesson.mockResolvedValue(false);
      await expect(
        controller.findOne(mockLessonId, studentReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns lesson for authorized student', async () => {
      service.findOne.mockResolvedValue(mockLesson);
      service.studentHasAccessToLesson.mockResolvedValue(true);
      const result = await controller.findOne(mockLessonId, studentReq);
      expect(result).toEqual(mockLesson);
    });
  });

  describe('create', () => {
    const dto: CreateLessonDto = {
      title: 'New',
      content: 'Content',
      lessonType: 'EXERCISE',
      videoUrl: 'url',
      duration: 12,
      moduleId: mockModuleId,
      order: 2,
    };

    it('throws ForbiddenException for student', async () => {
      await expect(controller.create(dto, studentReq)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException if TEACHER module not found', async () => {
      moduleService.findOne.mockResolvedValue(null as unknown as Module);
      await expect(controller.create(dto, professorReq)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if teacher is not owner', async () => {
      // Mocka que o módulo existe
      service.findExistentModule.mockResolvedValue({
        id: mockModuleId,
        createdAt: new Date(),
        updatedAt: new Date(),
        courseId: 'some-course-id',
        title: 'Mock Module Title',
        description: 'Mock description',
        order: 1,
      });

      // Mocka que o professor NÃO é dono do módulo
      service.isTeacherOwnerOfModule.mockResolvedValue(false);

      await expect(controller.create(dto, professorReq)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows admin to create', async () => {
      moduleService.findOne.mockResolvedValue({
        id: mockModuleId,
        title: 'Mock Module Title',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'Mock description',
        courseId: randomUUID(),
      });
      service.create.mockResolvedValue(mockLesson);
      const result = await controller.create(dto, adminReq);
      expect(result).toEqual(mockLesson);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated' };
    it('throws ForbiddenException for student', async () => {
      service.findOne.mockResolvedValue(mockLesson); // simula achar a lição
      await expect(
        controller.update(mockLessonId, updateDto, studentReq),
      ).rejects.toThrow(ForbiddenException);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if not found', async () => {
      service.findOne.mockResolvedValue(null);
      await expect(
        controller.update(mockLessonId, updateDto, adminReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates for admin', async () => {
      service.findOne.mockResolvedValue(mockLesson);
      service.update.mockResolvedValue({ ...mockLesson, ...updateDto });
      const result = await controller.update(mockLessonId, updateDto, adminReq);
      expect(result).toEqual(expect.objectContaining(updateDto));
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException for student', async () => {
      service.findOne.mockResolvedValue(mockLesson);
      await expect(controller.remove(mockLessonId, studentReq)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns message on delete', async () => {
      service.findOne.mockResolvedValue(mockLesson);
      service.remove.mockResolvedValue(mockLesson);
      const result = await controller.remove(mockLessonId, adminReq);
      expect(result).toEqual({ message: 'Lição removida com sucesso' });
    });
  });
});
