/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { adminReq, studentReq } from '../../__mocks__/user-mocks';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { Module } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

describe('ModulesController', () => {
  let controller: ModulesController;
  let service: DeepMockProxy<ModulesService>;

  const mockModuleId = createId();
  const mockCourseId = createId();

  const mockModule: Module = {
    id: mockModuleId,
    title: 'Test Module',
    description: 'This is a test module',
    courseId: mockCourseId,
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModulesController],
      providers: [
        { provide: ModulesService, useValue: mockDeep<ModulesService>() },
      ],
    }).compile();

    controller = module.get<ModulesController>(ModulesController);
    service = module.get(ModulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all modules', async () => {
      service.findAll.mockResolvedValue([mockModule]);
      const result = await controller.findAll();
      expect(result).toEqual([mockModule]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return module by id', async () => {
      service.findOne.mockResolvedValue(mockModule);
      const result = await controller.findOne(mockModuleId);
      expect(result).toEqual(mockModule);
      expect(service.findOne).toHaveBeenCalledWith(mockModuleId);
    });

    it('should throw NotFoundException if module not found', async () => {
      service.findOne.mockResolvedValue(null as unknown as Module);
      await expect(controller.findOne(mockModuleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      title: 'New Module',
      description: 'New description',
      courseId: mockCourseId,
      order: 1,
    };

    it('should create module for ADMIN', async () => {
      service.create.mockResolvedValue(mockModule);
      const result = await controller.create(createDto, adminReq);
      expect(result).toEqual(mockModule);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      await expect(controller.create(createDto, studentReq)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException for invalid data', async () => {
      // Simulando erro de validação no serviço (exemplo)
      service.create.mockRejectedValue(new BadRequestException('Invalid data'));
      await expect(
        controller.create({ ...createDto, title: '' }, adminReq),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Module' };

    it('should update module for ADMIN', async () => {
      service.findOne.mockResolvedValue(mockModule);
      service.update.mockResolvedValue({ ...mockModule, ...updateDto });
      const result = await controller.update(mockModuleId, updateDto, adminReq);
      expect(result).toEqual({ ...mockModule, ...updateDto });
      expect(service.update).toHaveBeenCalledWith(mockModuleId, updateDto);
    });

    it('should throw NotFoundException if module not found', async () => {
      service.findOne.mockResolvedValue(null as unknown as Module);
      await expect(
        controller.update(mockModuleId, updateDto, adminReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      service.findOne.mockResolvedValue(mockModule);
      await expect(
        controller.update(mockModuleId, updateDto, studentReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid data', async () => {
      service.findOne.mockResolvedValue(mockModule);
      service.update.mockRejectedValue(
        new BadRequestException('Invalid update data'),
      );
      await expect(
        controller.update(mockModuleId, { title: '' }, adminReq),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should delete module for ADMIN', async () => {
      service.findOne.mockResolvedValue(mockModule);
      service.remove.mockResolvedValue(mockModule);
      const result = await controller.remove(mockModuleId, adminReq);
      expect(result).toEqual({ message: 'Module deleted' });
      expect(service.remove).toHaveBeenCalledWith(mockModuleId);
    });

    it('should throw NotFoundException if module not found', async () => {
      service.findOne.mockResolvedValue(null as unknown as Module);
      await expect(controller.remove(mockModuleId, adminReq)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for STUDENT', async () => {
      service.findOne.mockResolvedValue(mockModule);
      await expect(controller.remove(mockModuleId, studentReq)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
