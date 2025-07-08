import { Test, TestingModule } from '@nestjs/testing';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { adminReq, studentReq, professorReq } from '../../__mocks__/user-mocks';

describe('TopicsController', () => {
  let controller: TopicsController;
  let service: TopicsService;

  const mockTopicId = randomUUID();
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
    it('should return a list of topics', async () => {
      mockPrismaService.topic.findMany.mockResolvedValue([mockTopic]);

      const result = await controller.findAll();

      expect(result).toEqual([mockTopic]);
      expect(mockPrismaService.topic.findMany).toHaveBeenCalledTimes(1);
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.topic.findMany.mockResolvedValue([]);

      const filters = {
        name: 'filtered topic',
        limit: '10',
        offset: '0',
      };

      await controller.findAll(filters.name, filters.limit, filters.offset);

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

  describe('findOne', () => {
    it('should return topic by ID', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);

      const result = await controller.findOne(mockTopicId);

      expect(result).toEqual(mockTopic);
      expect(mockPrismaService.topic.findUnique).toHaveBeenCalledWith({
        where: { id: mockTopicId },
      });
    });

    it('should throw NotFoundException when topic not found', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(null);

      await expect(controller.findOne(randomUUID())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid topic ID', async () => {
      await expect(controller.findOne('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    const createTopicDto: CreateTopicDto = {
      name: 'New Topic',
    };

    it('should create topic for ADMIN', async () => {
      const createdTopic = { id: randomUUID(), ...createTopicDto };
      mockPrismaService.topic.create.mockResolvedValue(createdTopic);

      const result = await controller.create(createTopicDto, adminReq);

      expect(result).toEqual(createdTopic);
      expect(mockPrismaService.topic.create).toHaveBeenCalledWith({
        data: createTopicDto,
      });
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { name: '' } as CreateTopicDto;
      await expect(controller.create(invalidDto, adminReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException for PROFESSOR', async () => {
      await expect(
        controller.create(createTopicDto, professorReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      await expect(
        controller.create(createTopicDto, studentReq),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateTopicDto = { name: 'Updated Topic' };

    it('should update topic for ADMIN', async () => {
      const updatedTopic = { ...mockTopic, ...updateDto };
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);
      mockPrismaService.topic.update.mockResolvedValue(updatedTopic);

      const result = await controller.update(mockTopicId, updateDto, adminReq);

      expect(result).toEqual(updatedTopic);
      expect(mockPrismaService.topic.update).toHaveBeenCalledWith({
        where: { id: mockTopicId },
        data: updateDto,
      });
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { name: '' } as UpdateTopicDto;
      await expect(
        controller.update(mockTopicId, invalidDto, adminReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(
        controller.update('invalid-id', updateDto, adminReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for PROFESSOR', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(
        controller.update(mockTopicId, updateDto, professorReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(
        controller.update(mockTopicId, updateDto, studentReq),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete topic for ADMIN', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);
      mockPrismaService.topic.delete.mockResolvedValue(mockTopic);

      const result = await controller.remove(mockTopicId, adminReq);

      expect(result).toEqual({ message: 'Tópico deletado com sucesso.' });
      expect(mockPrismaService.topic.delete).toHaveBeenCalledWith({
        where: { id: mockTopicId },
      });
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(controller.remove('invalid-id', adminReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException for PROFESSOR', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(
        controller.remove(mockTopicId, professorReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      mockPrismaService.topic.findUnique.mockResolvedValue(mockTopic);

      await expect(controller.remove(mockTopicId, studentReq)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
