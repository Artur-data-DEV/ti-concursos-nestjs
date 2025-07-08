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
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('TopicsController', () => {
  let controller: TopicsController;
  let service: DeepMockProxy<TopicsService>;
  let prismaService: DeepMockProxy<PrismaService>;

  const mockTopicId = randomUUID();
  const mockTopic = {
    id: mockTopicId,
    name: 'Test Topic',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TopicsController],
      providers: [
        { provide: TopicsService, useValue: mockDeep<TopicsService>() },
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    controller = module.get<TopicsController>(TopicsController);
    service = module.get(TopicsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of topics', async () => {
      service.findAll.mockResolvedValue([mockTopic]);

      const result = await controller.findAll();

      expect(result).toEqual([mockTopic]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should apply filters when provided', async () => {
      service.findAll.mockResolvedValue([]);

      const filters = {
        name: 'filtered topic',
        limit: '10',
        offset: '0',
      };

      await controller.findAll(filters.name, filters.limit, filters.offset);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          name: filters.name,
          limit: parseInt(filters.limit),
          offset: parseInt(filters.offset),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return topic by ID', async () => {
      service.findOne.mockResolvedValue(mockTopic);

      const result = await controller.findOne(mockTopicId);

      expect(result).toEqual(mockTopic);
      expect(service.findOne).toHaveBeenCalledWith(mockTopicId);
    });

    it('should throw NotFoundException when topic not found', async () => {
      service.findOne.mockResolvedValue(null);

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
      service.create.mockResolvedValue(createdTopic);

      const result = await controller.create(createTopicDto, adminReq);

      expect(result).toEqual(createdTopic);
      expect(service.create).toHaveBeenCalledWith(createTopicDto);
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
      service.findOne.mockResolvedValue(mockTopic);
      service.update.mockResolvedValue(updatedTopic);

      const result = await controller.update(mockTopicId, updateDto, adminReq);

      expect(result).toEqual(updatedTopic);
      expect(service.update).toHaveBeenCalledWith(mockTopicId, updateDto);
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
      service.findOne.mockResolvedValue(mockTopic);

      await expect(
        controller.update(mockTopicId, updateDto, professorReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      service.findOne.mockResolvedValue(mockTopic);

      await expect(
        controller.update(mockTopicId, updateDto, studentReq),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete topic for ADMIN', async () => {
      service.findOne.mockResolvedValue(mockTopic);
      service.remove.mockResolvedValue(mockTopic);

      const result = await controller.remove(mockTopicId, adminReq);

      expect(result).toEqual({ message: 'Tópico deletado com sucesso.' });
      expect(service.remove).toHaveBeenCalledWith(mockTopicId);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(controller.remove('invalid-id', adminReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException for PROFESSOR', async () => {
      service.findOne.mockResolvedValue(mockTopic);

      await expect(
        controller.remove(mockTopicId, professorReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      service.findOne.mockResolvedValue(mockTopic);

      await expect(controller.remove(mockTopicId, studentReq)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});


