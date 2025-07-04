import { Test, TestingModule } from '@nestjs/testing';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('TopicsController', () => {
  let controller: TopicsController;
  let service: TopicsService;

  const mockTopicId = randomUUID();
  const mockAdminId = randomUUID();
  const mockProfessorId = randomUUID();
  const mockStudentId = randomUUID();

  const mockTopic = {
    id: mockTopicId,
    name: 'Test Topic',
  };

  const mockPrismaService = {
    topic: {
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
      controllers: [TopicsController],
      providers: [
        TopicsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<TopicsController>(TopicsController);
    service = module.get<TopicsService>(TopicsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of topics for any authenticated user', async () => {
      mockPrismaService.topic.findMany.mockResolvedValue([mockTopic]);

      const result = await controller.findAll(mockAuthenticatedStudentRequest);

      expect(result).toEqual([mockTopic]);
      expect(mockPrismaService.topic.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return topic by ID for any authenticated user', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);

      const result = await controller.findAll(
        mockAuthenticatedStudentRequest,
        mockTopicId,
      );

      expect(result).toEqual(mockTopic);
      expect(mockPrismaService.topic.findUnique).toHaveBeenCalledWith({
        where: { id: mockTopicId },
      });
    });

    it('should throw BadRequestException for invalid topic ID', async () => {
      await expect(
        controller.findAll(mockAuthenticatedStudentRequest, 'invalid-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when topic not found', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(null);

      await expect(
        controller.findAll(mockAuthenticatedStudentRequest, randomUUID()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.topic.findMany.mockResolvedValue([]);

      const filters = {
        name: 'filtered topic',
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

      expect(mockPrismaService.topic.findMany).toHaveBeenCalledWith(
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
    const createTopicDto = {
      name: 'New Topic',
    };

    it('should create topic for ADMIN', async () => {
      const createdTopic = { id: randomUUID(), ...createTopicDto };
      mockPrismaService.topic.create.mockResolvedValue(createdTopic);

      const result = await controller.create(
        createTopicDto,
        mockAuthenticatedAdminRequest,
      );

      expect(result).toEqual(createdTopic);
      expect(mockPrismaService.topic.create).toHaveBeenCalledWith({
        data: createTopicDto,
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
        controller.create(createTopicDto, mockAuthenticatedProfessorRequest),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Updated Topic' };

    it('should update topic for ADMIN', async () => {
      const updatedTopic = { ...mockTopic, ...updateDto };
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);
      mockPrismaService.topic.update.mockResolvedValue(updatedTopic);

      const result = await controller.update(
        mockTopicId,
        updateDto,
        mockAuthenticatedAdminRequest,
      );

      expect(result).toEqual(updatedTopic);
      expect(mockPrismaService.topic.update).toHaveBeenCalledWith({
        where: { id: mockTopicId },
        data: updateDto,
      });
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { name: '' };
      await expect(
        controller.update(
          mockTopicId,
          invalidDto,
          mockAuthenticatedAdminRequest,
        ),
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

    it('should throw ForbiddenException for PROFESSOR', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(
        controller.update(
          mockTopicId,
          updateDto,
          mockAuthenticatedProfessorRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(
        controller.update(
          mockTopicId,
          updateDto,
          mockAuthenticatedStudentRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete topic for ADMIN', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);
      mockPrismaService.topic.delete.mockResolvedValue(mockTopic);

      const result = await controller.remove(
        mockTopicId,
        mockAuthenticatedAdminRequest,
      );

      expect(result).toEqual({ message: 'Topic deleted' });
      expect(mockPrismaService.topic.delete).toHaveBeenCalledWith({
        where: { id: mockTopicId },
      });
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(
        controller.remove('invalid-id', mockAuthenticatedAdminRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for PROFESSOR', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(
        controller.remove(mockTopicId, mockAuthenticatedProfessorRequest),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
