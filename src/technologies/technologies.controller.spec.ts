import { Test, TestingModule } from '@nestjs/testing';
import { TechnologiesController } from './technologies.controller';
import { TechnologiesService } from './technologies.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TechnologiesController', () => {
  let controller: TechnologiesController;
  let service: TechnologiesService;

  const mockTechnologyId = randomUUID();
  const mockAdminId = randomUUID();
  const mockProfessorId = randomUUID();
  const mockStudentId = randomUUID();

  const mockTechnology = {
    id: mockTechnologyId,
    name: 'Test Technology',
  };

  const mockPrismaService = {
    technology: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
      controllers: [TechnologiesController],
      providers: [
        TechnologiesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<TechnologiesController>(TechnologiesController);
    service = module.get<TechnologiesService>(TechnologiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of technologies for any authenticated user', async () => {
      mockPrismaService.technology.findMany.mockResolvedValue([mockTechnology]);

      const result = await controller.findAll(mockAuthenticatedStudentRequest);

      expect(result).toEqual([mockTechnology]);
      expect(mockPrismaService.technology.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return technology by ID for any authenticated user', async () => {
      mockPrismaService.technology.findUnique.mockResolvedValue(mockTechnology);

      const result = await controller.findAll(mockAuthenticatedStudentRequest, mockTechnologyId);

      expect(result).toEqual(mockTechnology);
      expect(mockPrismaService.technology.findUnique).toHaveBeenCalledWith({ where: { id: mockTechnologyId } });
    });

    it('should throw BadRequestException for invalid technology ID', async () => {
      await expect(controller.findAll(mockAuthenticatedStudentRequest, 'invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when technology not found', async () => {
      mockPrismaService.technology.findUnique.mockResolvedValue(null);

      await expect(controller.findAll(mockAuthenticatedStudentRequest, randomUUID())).rejects.toThrow(NotFoundException);
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.technology.findMany.mockResolvedValue([]);

      const filters = {
        name: 'filtered technology',
        limit: '10',
        offset: '0',
      };

      await controller.findAll(
        mockAuthenticatedStudentRequest,
        undefined,
        filters.name,
        filters.limit,
        filters.offset,
      );

      expect(mockPrismaService.technology.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          name: { contains: filters.name, mode: 'insensitive' },
        },
        take: 10,
        skip: 0,
      }));
    });
  });

  describe('create', () => {
    const createTechnologyDto = {
      name: 'New Technology',
    };

    it('should create technology for ADMIN', async () => {
      const createdTechnology = { id: randomUUID(), ...createTechnologyDto };
      mockPrismaService.technology.create.mockResolvedValue(createdTechnology);

      const result = await controller.create(createTechnologyDto, mockAuthenticatedAdminRequest);

      expect(result).toEqual(createdTechnology);
      expect(mockPrismaService.technology.create).toHaveBeenCalledWith({ data: createTechnologyDto });
    });

    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = { name: "" };
      await expect(controller.create(invalidDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException for PROFESSOR", async () => {
      await expect(controller.create(createTechnologyDto, mockAuthenticatedProfessorRequest)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Updated Technology' };

    it('should update technology for ADMIN', async () => {
      const updatedTechnology = { ...mockTechnology, ...updateDto };
      mockPrismaService.technology.findUnique.mockResolvedValue(mockTechnology);
      mockPrismaService.technology.update.mockResolvedValue(updatedTechnology);

      const result = await controller.update(mockTechnologyId, updateDto, mockAuthenticatedAdminRequest);

      expect(result).toEqual(updatedTechnology);
      expect(mockPrismaService.technology.update).toHaveBeenCalledWith({ where: { id: mockTechnologyId }, data: updateDto });
    });

    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = { name: "" };
      await expect(controller.update(mockTechnologyId, invalidDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for invalid ID", async () => {
      await expect(controller.update("invalid-id", updateDto, mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException for PROFESSOR", async () => {
      mockPrismaService.technology.findUnique.mockResolvedValue(mockTechnology);

      await expect(controller.update(mockTechnologyId, updateDto, mockAuthenticatedProfessorRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when technology not found', async () => {
      mockPrismaService.technology.findUnique.mockResolvedValue(null);

      await expect(controller.update(randomUUID(), updateDto, mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete technology for ADMIN', async () => {
      mockPrismaService.technology.findUnique.mockResolvedValue(mockTechnology);
      mockPrismaService.technology.delete.mockResolvedValue(mockTechnology);

      const result = await controller.remove(mockTechnologyId, mockAuthenticatedAdminRequest);

      expect(result).toEqual({ message: 'Technology deleted' });
      expect(mockPrismaService.technology.delete).toHaveBeenCalledWith({ where: { id: mockTechnologyId } });
    });

    it('should throw ForbiddenException for PROFESSOR', async () => {
      mockPrismaService.technology.findUnique.mockResolvedValue(mockTechnology);

      await expect(controller.remove(mockTechnologyId, mockAuthenticatedProfessorRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      mockPrismaService.technology.findUnique.mockResolvedValue(mockTechnology);

      await expect(controller.remove(mockTechnologyId, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException for invalid ID", async () => {
      await expect(controller.remove("invalid-id", mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when technology not found', async () => {
      mockPrismaService.technology.findUnique.mockResolvedValue(null);

      await expect(controller.remove(randomUUID(), mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });
});

