import { Test, TestingModule } from '@nestjs/testing';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ModulesController', () => {
  let controller: ModulesController;
  let service: ModulesService;

  const mockModuleId = randomUUID();
  const mockCourseId = randomUUID();
  const mockAdminId = randomUUID();
  const mockProfessorId = randomUUID();
  const mockStudentId = randomUUID();

  const mockModule = {
    id: mockModuleId,
    title: 'Test Module',
    description: 'This is a test module',
    courseId: mockCourseId,
    order: 1,
  };

  const mockPrismaService = {
    module: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    course: {
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
      controllers: [ModulesController],
      providers: [
        ModulesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<ModulesController>(ModulesController);
    service = module.get<ModulesService>(ModulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of modules for any authenticated user', async () => {
      mockPrismaService.module.findMany.mockResolvedValue([mockModule]);

      const result = await controller.findAll(mockAuthenticatedStudentRequest);

      expect(result).toEqual([mockModule]);
      expect(mockPrismaService.module.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return module by ID for any authenticated user', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);

      const result = await controller.findAll(mockAuthenticatedStudentRequest, mockModuleId);

      expect(result).toEqual(mockModule);
      expect(mockPrismaService.module.findUnique).toHaveBeenCalledWith({ where: { id: mockModuleId } });
    });

    it('should throw BadRequestException for invalid module ID', async () => {
      await expect(controller.findAll(mockAuthenticatedStudentRequest, 'invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when module not found', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(null);

      await expect(controller.findAll(mockAuthenticatedStudentRequest, randomUUID())).rejects.toThrow(NotFoundException);
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.module.findMany.mockResolvedValue([]);

      const filters = {
        courseId: randomUUID(),
        limit: '10',
        offset: '0',
      };

      await controller.findAll(
        mockAuthenticatedStudentRequest,
        undefined,
        filters.courseId,
        filters.limit,
        filters.offset,
      );

      expect(mockPrismaService.module.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          courseId: filters.courseId,
        },
        take: 10,
        skip: 0,
      }));
    });
  });

  describe('create', () => {
    const createModuleDto = {
      title: 'New Module',
      description: 'Description of new module',
      courseId: mockCourseId,
      order: 2,
    };

    it('should create module for ADMIN', async () => {
      const createdModule = { id: randomUUID(), ...createModuleDto };
      mockPrismaService.course.findUnique.mockResolvedValue({ id: mockCourseId });
      mockPrismaService.module.create.mockResolvedValue(createdModule);

      const result = await controller.create(createModuleDto, mockAuthenticatedAdminRequest);

      expect(result).toEqual(createdModule);
      expect(mockPrismaService.module.create).toHaveBeenCalledWith({ data: createModuleDto });
    });

    it('should create module for PROFESSOR', async () => {
      const createdModule = { id: randomUUID(), ...createModuleDto };
      mockPrismaService.course.findUnique.mockResolvedValue({ id: mockCourseId });
      mockPrismaService.module.create.mockResolvedValue(createdModule);

      const result = await controller.create(createModuleDto, mockAuthenticatedProfessorRequest);

      expect(result).toEqual(createdModule);
      expect(mockPrismaService.module.create).toHaveBeenCalledWith({ data: createModuleDto });
    });

    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = { ...createModuleDto, title: '' };
      await expect(controller.create(invalidDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException for STUDENT", async () => {
      await expect(controller.create(createModuleDto, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if course not found', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(controller.create(createModuleDto, mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Module' };

    it('should update module for ADMIN', async () => {
      const updatedModule = { ...mockModule, ...updateDto };
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.module.update.mockResolvedValue(updatedModule);

      const result = await controller.update(mockModuleId, updateDto, mockAuthenticatedAdminRequest);

      expect(result).toEqual(updatedModule);
      expect(mockPrismaService.module.update).toHaveBeenCalledWith({ where: { id: mockModuleId }, data: updateDto });
    });

    it('should update module for PROFESSOR', async () => {
      const updatedModule = { ...mockModule, ...updateDto };
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.module.update.mockResolvedValue(updatedModule);

      const result = await controller.update(mockModuleId, updateDto, mockAuthenticatedProfessorRequest);

      expect(result).toEqual(updatedModule);
      expect(mockPrismaService.module.update).toHaveBeenCalledWith({ where: { id: mockModuleId }, data: updateDto });
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);

      await expect(controller.update(mockModuleId, updateDto, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(controller.update('invalid-id', updateDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { title: '' };
      await expect(controller.update(mockModuleId, invalidDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when module not found', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(null);

      await expect(controller.update(randomUUID(), updateDto, mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete module for ADMIN', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.module.delete.mockResolvedValue(mockModule);

      const result = await controller.remove(mockModuleId, mockAuthenticatedAdminRequest);

      expect(result).toEqual({ message: 'Module deleted' });
      expect(mockPrismaService.module.delete).toHaveBeenCalledWith({ where: { id: mockModuleId } });
    });

    it('should delete module for PROFESSOR', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.module.delete.mockResolvedValue(mockModule);

      const result = await controller.remove(mockModuleId, mockAuthenticatedProfessorRequest);

      expect(result).toEqual({ message: 'Module deleted' });
      expect(mockPrismaService.module.delete).toHaveBeenCalledWith({ where: { id: mockModuleId } });
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);

      await expect(controller.remove(mockModuleId, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(controller.remove('invalid-id', mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when module not found', async () => {
      mockPrismaService.module.findUnique.mockResolvedValue(null);

      await expect(controller.remove(randomUUID(), mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });
});