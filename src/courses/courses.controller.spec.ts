import { adminReq, professorId, studentReq } from '../__mocks__/user_mocks'; // Assumindo mocks de requisições autenticadas
import { Test, TestingModule } from '@nestjs/testing';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { CreateCourseDto, IdParamDto } from './courses.dto';

describe('CoursesController', () => {
  let controller: CoursesController;
  let service: CoursesService;

  const mockCourseId = randomUUID();

  const mockCourse = {
    id: mockCourseId,
    title: 'Test Course',
    description: 'This is a test course',
    instructorId: professorId,
    thumbnail: null,
    price: null,
    isPublished: false,
  };

  const mockPrismaService = {
    course: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
    service = module.get<CoursesService>(CoursesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return courses with filters for authenticated user', async () => {
      mockPrismaService.course.findMany.mockResolvedValue([mockCourse]);

      const result = await controller.findAll(
        studentReq,
        undefined,
        professorId,
        '5',
        '0',
      );

      expect(result).toEqual([mockCourse]);
      expect(mockPrismaService.course.findMany).toHaveBeenCalledWith({
        where: { instructorId: professorId },
        include: {
          modules: { include: { lessons: true } },
          enrollments: true,
          reviews: true,
        },
        take: 5,
        skip: 0,
      });
    });

    it('should throw ForbiddenException if no user', async () => {
      const fakeUser = {} as AuthenticatedRequest;
      await expect(controller.findAll(fakeUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create', () => {
    const createDto: CreateCourseDto = {
      title: 'New Course',
      description: 'Description',
      instructorId: professorId,
      thumbnail: null,
      price: 10,
      isPublished: true,
    };

    it('should create course for ADMIN with valid data', async () => {
      mockPrismaService.course.create.mockResolvedValue({
        id: randomUUID(),
        ...createDto,
      });

      const result = await controller.create(createDto, adminReq);

      expect(result).toMatchObject(createDto);
      expect(mockPrismaService.course.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          instructor: { connect: { id: createDto.instructorId } },
        },
      });
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = {
        id: randomUUID(),
        description: 1,
        title: 2,
        price: 'a',
      };

      // Transforma o objeto como o Nest faria
      const pipe = new ValidationPipe({ transform: true });
      try {
        await pipe.transform(invalidDto, {
          type: 'body',
          metatype: CreateCourseDto,
        });
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        return;
      }

      // Se passou da validação, falha o teste
      fail('ValidationPipe não lançou BadRequestException como esperado.');
    });

    it('should throw ForbiddenException if user not ADMIN or TEACHER', async () => {
      await expect(controller.create(createDto, studentReq)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if TEACHER tries to create course for another instructor', async () => {
      const teacherReq = {
        user: { sub: randomUUID(), role: 'TEACHER' },
      } as AuthenticatedRequest;
      const dtoWithOtherInstructor = {
        ...createDto,
        instructorId: professorId, // different from teacherReq.user.sub
      };
      await expect(
        controller.create(dtoWithOtherInstructor, teacherReq),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Title', description: 'Updated desc' };

    it('should update course for ADMIN', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.course.update.mockResolvedValue({
        ...mockCourse,
        ...updateDto,
      });

      const result = await controller.update(
        { id: mockCourseId },
        updateDto,
        adminReq,
      );

      expect(result).toMatchObject(updateDto);
      expect(mockPrismaService.course.update).toHaveBeenCalledWith({
        where: { id: mockCourseId },
        data: updateDto,
      });
    });

    it('should throw BadRequestException for invalid ID', async () => {
      const pipe = new ValidationPipe({ transform: true });

      const dto = new IdParamDto();
      dto.id = 'invalid-uuid'; // Valor inválido

      await expect(() =>
        pipe.transform(dto, { type: 'param', metatype: IdParamDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if course not found', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);
      await expect(
        controller.update({ id: mockCourseId }, updateDto, adminReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not authorized', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      const otherUserReq = {
        user: { sub: 'other-id', role: 'TEACHER' },
      } as AuthenticatedRequest;

      await expect(
        controller.update({ id: mockCourseId }, updateDto, otherUserReq),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete course for ADMIN', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.course.delete.mockResolvedValue(mockCourse);

      const result = await controller.remove({ id: mockCourseId }, adminReq);

      expect(result).toEqual({ message: 'Curso deletado com sucesso.' });
      expect(mockPrismaService.course.delete).toHaveBeenCalledWith({
        where: { id: mockCourseId },
      });
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(
        controller.remove({ id: 'invalid-uuid' }, adminReq),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if course not found', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        controller.remove({ id: mockCourseId }, adminReq),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not authorized', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);

      const otherUserReq = {
        user: { sub: 'other-id', role: 'TEACHER' },
      } as AuthenticatedRequest;

      await expect(
        controller.remove({ id: mockCourseId }, otherUserReq),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
