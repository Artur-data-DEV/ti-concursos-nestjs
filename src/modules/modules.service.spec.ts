/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ModulesService } from './modules.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { NotFoundException } from '@nestjs/common';
import { CreateModuleDto } from './dto/create-module.dto';
import { Module, Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

describe('ModulesService', () => {
  let service: ModulesService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModulesService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get<ModulesService>(ModulesService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a module', async () => {
      const dto: CreateModuleDto = {
        title: 'Module 1',
        courseId: 'course-uuid',
        description: 'Description',
        order: 1,
      };

      const expectedPrismaInput: Prisma.ModuleCreateInput = {
        title: dto.title,
        order: dto.order,
        description: dto.description,
        course: {
          connect: { id: dto.courseId },
        },
      };

      const createdModule: Module = {
        id: createId(),
        title: dto.title,
        courseId: dto.courseId,
        description: dto.description ?? null,
        order: dto.order,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.module.create.mockResolvedValue(createdModule);

      const result = await service.create(dto);

      expect(prisma.module.create).toHaveBeenCalledWith({
        data: expectedPrismaInput,
      });
      expect(result).toEqual(createdModule);
      expect(result.id).toMatch(/^[a-z0-9]{20,25}$/);
    });
  });

  describe('findAll', () => {
    it('should return an array of modules', async () => {
      const modules = [
        { id: '1', title: 'Mod1', courseId: 'c1', order: 1 },
        { id: '2', title: 'Mod2', courseId: 'c2', order: 2 },
      ];
      prisma.module.findMany.mockResolvedValue(modules as any);

      const result = await service.findAll();

      expect(prisma.module.findMany).toHaveBeenCalled();
      expect(result).toEqual(modules);
    });
  });

  describe('findOne', () => {
    it('should return a module if found', async () => {
      const module = {
        id: 'module-id',
        title: 'Module',
        courseId: 'course-id',
        order: 1,
      };
      prisma.module.findUnique.mockResolvedValue(module as any);

      const result = await service.findOne('module-id');

      expect(prisma.module.findUnique).toHaveBeenCalledWith({
        where: { id: 'module-id' },
      });
      expect(result).toEqual(module);
    });

    it('should throw NotFoundException if module not found', async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('isTeacherOwnerOfModule', () => {
    it('should return true if teacher owns module', async () => {
      prisma.module.findUnique.mockResolvedValue({
        course: { instructor: { id: 'teacher-id' } },
      } as any);

      const result = await service.isTeacherOwnerOfModule(
        'teacher-id',
        'module-id',
      );

      expect(prisma.module.findUnique).toHaveBeenCalledWith({
        where: { id: 'module-id' },
        select: {
          course: {
            select: { instructor: { select: { id: true } } },
          },
        },
      });
      expect(result).toBe(true);
    });

    it('should return false if module not found or no instructor', async () => {
      prisma.module.findUnique.mockResolvedValue(null);
      let result = await service.isTeacherOwnerOfModule(
        'teacher-id',
        'module-id',
      );
      expect(result).toBe(false);

      prisma.module.findUnique.mockResolvedValue({ course: null } as any);
      result = await service.isTeacherOwnerOfModule('teacher-id', 'module-id');
      expect(result).toBe(false);

      prisma.module.findUnique.mockResolvedValue({
        course: { instructor: { id: 'other-teacher' } },
      } as any);
      result = await service.isTeacherOwnerOfModule('teacher-id', 'module-id');
      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    it('should update a module', async () => {
      const id = 'module-id';
      const data = { title: 'Updated Title' };

      prisma.module.findUnique.mockResolvedValue({
        id,
        title: 'Old Title',
        courseId: 'course-id',
        order: 1,
      } as any);
      prisma.module.update.mockResolvedValue({ ...data, id } as any);

      const result = await service.update(id, data as any);

      expect(prisma.module.update).toHaveBeenCalledWith({
        where: { id },
        data,
      });
      expect(result).toEqual({ ...data, id });
    });

    it('should throw NotFoundException if module not found before update', async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a module', async () => {
      const id = 'module-id';
      const module = {
        id,
        title: 'Title',
        courseId: 'course-id',
        order: 1,
        description: 'saadasd',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.module.findUnique.mockResolvedValue(module);
      prisma.module.delete.mockResolvedValue(module);

      const result = await service.remove(id);

      expect(prisma.module.delete).toHaveBeenCalledWith({ where: { id } });
      expect(result).toEqual(module);
    });

    it('should throw NotFoundException if module not found before delete', async () => {
      prisma.module.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
