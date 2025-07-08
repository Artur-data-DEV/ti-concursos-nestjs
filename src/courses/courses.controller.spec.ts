/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  adminReq,
  professorId,
  professorReq,
  studentReq,
} from '../__mocks__/user_mocks';
import { CreateCourseDto } from './dto/create-course.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const mockCourseId = randomUUID();

const mockCourse = {
  id: mockCourseId,
  title: 'Test Course',
  description: 'A test course',
  instructorId: professorId,
  thumbnail: null,
  price: null,
  isPublished: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CoursesController', () => {
  let controller: CoursesController;
  let service: DeepMockProxy<CoursesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        {
          provide: CoursesService,
          useValue: mockDeep<CoursesService>(),
        },
      ],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
    service = module.get<DeepMockProxy<CoursesService>>(CoursesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('deve retornar cursos com filtros corretos', async () => {
      service.findAll.mockResolvedValue([mockCourse]);

      const result = await controller.findAll(
        studentReq,
        undefined,
        professorId,
        '10',
        '0',
      );

      expect(result).toEqual([mockCourse]);
      expect(service.findAll).toHaveBeenCalledWith({
        instructorId: professorId,
        limit: '10',
        offset: '0',
        title: undefined,
      });
    });
  });

  describe('create', () => {
    const dto: CreateCourseDto = {
      title: 'Novo Curso',
      description: 'Descricao',
      instructorId: professorId,
      thumbnail: null,
      price: 10,
      isPublished: true,
    };

    it("deve lançar BadRequestException se dados inválidos", async () => {
      const invalidDto = {
        title: "",
        description: "",
        instructorId: "invalid-uuid",
        price: -1,
      };

      await expect(controller.create(invalidDto as CreateCourseDto, adminReq)).rejects.toThrow(BadRequestException);
    });

    it("deve criar curso com sucesso (ADMIN)", async () => {
      service.create.mockResolvedValue({ ...mockCourse, ...dto });

      const result = await controller.create(dto, adminReq);

      expect(result).toEqual(expect.objectContaining(dto));
      expect(service.create).toHaveBeenCalledWith({
        ...dto,
        instructor: {
          connect: { id: dto.instructorId },
        },
      });
    });

    it('deve lançar ForbiddenException se professor tentar criar curso de outro professor', async () => {
      const dto: CreateCourseDto = {
        title: 'Curso inválido',
        description: 'Teste',
        instructorId: 'outro-professor-id',
        thumbnail: null,
        price: 10,
        isPublished: true,
      };

      await expect(controller.create(dto, professorReq)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve propagar erro se serviço falhar', async () => {
      service.create.mockRejectedValue(new ForbiddenException());

      await expect(controller.create(dto, studentReq)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    const updateData = { title: 'Atualizado' };

    it('deve chamar update com usuário autenticado', async () => {
      // 👇 Simula que o curso existe
      service.findOne.mockResolvedValue(mockCourse);

      service.update.mockResolvedValue({ ...mockCourse, ...updateData });

      const result = await controller.update(
        mockCourse.id,
        updateData,
        professorReq,
      );

      expect(result.title).toBe('Atualizado');
      expect(service.update).toHaveBeenCalledWith(mockCourse.id, updateData);
    });

    it('deve lançar NotFoundException se curso não existir no update', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(
        controller.update(
          mockCourse.id,
          { title: 'Update inválido' },
          professorReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException se professor tentar atualizar curso de outro professor', async () => {
      service.findOne.mockResolvedValue({
        ...mockCourse,
        instructorId: 'outro-professor-id',
      });

      await expect(
        controller.update(
          mockCourse.id,
          { title: 'Update inválido' },
          professorReq,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar NotFoundException se Prisma lançar P2025 no update', async () => {
      service.findOne.mockResolvedValue(mockCourse);

      const prismaError = new PrismaClientKnownRequestError('msg', {
        code: 'P2025',
        clientVersion: '1',
      });
      service.update.mockRejectedValue(prismaError);

      await expect(
        controller.update(
          mockCourse.id,
          { title: 'Erro Prisma' },
          professorReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deve chamar service.remove com usuário autenticado', async () => {
      service.findOne.mockResolvedValue(mockCourse);
      service.remove.mockResolvedValue(mockCourse);

      const result = await controller.remove(mockCourseId, adminReq);

      expect(result).toEqual({ message: 'Curso deletado com sucesso.' });
      expect(service.remove).toHaveBeenCalledWith(mockCourseId);
    });
    it('deve lançar BadRequestException se ID do curso for inválido', async () => {
      await expect(controller.remove('id-invalido', adminReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve lançar NotFoundException se curso não existir no delete', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.remove(mockCourse.id, adminReq)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ForbiddenException se professor tentar deletar curso de outro professor', async () => {
      service.findOne.mockResolvedValue({
        ...mockCourse,
        instructorId: 'outro-professor-id',
      });

      await expect(
        controller.remove(mockCourse.id, professorReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar NotFoundException se Prisma lançar P2025 no delete', async () => {
      service.findOne.mockResolvedValue(mockCourse);

      const prismaError = new PrismaClientKnownRequestError('msg', {
        code: 'P2025',
        clientVersion: '1',
      });
      service.remove.mockRejectedValue(prismaError);

      await expect(controller.remove(mockCourse.id, adminReq)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
