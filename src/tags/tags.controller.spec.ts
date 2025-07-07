import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('TagsController', () => {
  let controller: TagsController;
  let service: TagsService;

  const mockTagId = randomUUID();
  const mockAdminId = randomUUID();
  const mockProfessorId = randomUUID();
  const mockStudentId = randomUUID();

  const mockTag = {
    id: mockTagId,
    name: 'Test Tag',
  };

  const mockPrismaService = {
    tag: {
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
      controllers: [TagsController],
      providers: [
        TagsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    service = module.get<TagsService>(TagsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of tags for any authenticated user', async () => {
      mockPrismaService.tag.findMany.mockResolvedValue([mockTag]);

      const result = await controller.findAll(mockAuthenticatedStudentRequest);

      expect(result).toEqual([mockTag]);
      expect(mockPrismaService.tag.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return tag by ID for any authenticated user', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(mockTag);

      const result = await controller.findAll(
        mockAuthenticatedStudentRequest,
        mockTagId,
      );

      expect(result).toEqual(mockTag);
      expect(mockPrismaService.tag.findUnique).toHaveBeenCalledWith({
        where: { id: mockTagId },
      });
    });

    it('should throw BadRequestException for invalid tag ID', async () => {
      await expect(
        controller.findAll(mockAuthenticatedStudentRequest, 'invalid-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when tag not found', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(null);

      await expect(
        controller.findAll(mockAuthenticatedStudentRequest, randomUUID()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.tag.findMany.mockResolvedValue([]);

      const filters = {
        name: 'filtered tag',
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

      expect(mockPrismaService.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { contains: filters.name, mode: 'insensitive' },
          },
          take: 10,
          skip: 0,
        }),
      );
    });
  });

  describe('create', () => {
    const createTagDto = {
      name: 'New Tag',
    };

    it('should create tag for ADMIN', async () => {
      const createdTag = { id: randomUUID(), ...createTagDto };
      mockPrismaService.tag.create.mockResolvedValue(createdTag);

      const result = await controller.create(
        createTagDto,
        mockAuthenticatedAdminRequest,
      );

      expect(result).toEqual(createdTag);
      expect(mockPrismaService.tag.create).toHaveBeenCalledWith({
        data: createTagDto,
      });
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { name: '' };
      await expect(
        controller.create(invalidDto, mockAuthenticatedAdminRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for PROFESSOR', async () => {
      await expect(
        controller.create(createTagDto, mockAuthenticatedProfessorRequest),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Updated Tag' };

    it('should update tag for ADMIN', async () => {
      const updatedTag = { ...mockTag, ...updateDto };
      mockPrismaService.tag.findUnique.mockResolvedValue(mockTag);
      mockPrismaService.tag.update.mockResolvedValue(updatedTag);

      const result = await controller.update(
        mockTagId,
        updateDto,
        mockAuthenticatedAdminRequest,
      );

      expect(result).toEqual(updatedTag);
      expect(mockPrismaService.tag.update).toHaveBeenCalledWith({
        where: { id: mockTagId },
        data: updateDto,
      });
    });

    it('should throw ForbiddenException for PROFESSOR', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(mockTag);

      await expect(
        controller.update(
          mockTagId,
          updateDto,
          mockAuthenticatedProfessorRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(mockTag);

      await expect(
        controller.update(
          mockTagId,
          updateDto,
          mockAuthenticatedStudentRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { name: '' };
      await expect(
        controller.update(mockTagId, invalidDto, mockAuthenticatedAdminRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(
        controller.update(
          'invalid-id',
          updateDto,
          mockAuthenticatedAdminRequest,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when tag not found', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(null);

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
    it('should delete tag for ADMIN', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(mockTag);
      mockPrismaService.tag.delete.mockResolvedValue(mockTag);

      const result = await controller.remove(
        mockTagId,
        mockAuthenticatedAdminRequest,
      );

      expect(result).toEqual({ message: 'Tag deleted' });
      expect(mockPrismaService.tag.delete).toHaveBeenCalledWith({
        where: { id: mockTagId },
      });
    });

    it('should throw ForbiddenException for PROFESSOR', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(mockTag);

      await expect(
        controller.remove(mockTagId, mockAuthenticatedProfessorRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(mockTag);

      await expect(
        controller.remove(mockTagId, mockAuthenticatedStudentRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(
        controller.remove('invalid-id', mockAuthenticatedAdminRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when tag not found', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(null);

      await expect(
        controller.remove(randomUUID(), mockAuthenticatedAdminRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
