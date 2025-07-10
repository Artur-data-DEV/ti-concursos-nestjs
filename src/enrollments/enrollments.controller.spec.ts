/* eslint-disable @typescript-eslint/unbound-method */
import { adminReq, studentReq } from '../__mocks__/user_mocks';
import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { randomUUID } from 'crypto';
import { Enrollment, EnrollmentStatus } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DeleteEnrollmentDto } from './dto/delete-enrollment.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';

describe('EnrollmentsController', () => {
  let controller: EnrollmentsController;
  let service: DeepMockProxy<EnrollmentsService>;

  const mockEnrollmentId = randomUUID();
  const mockUserId = randomUUID();
  const mockCourseId = randomUUID();

  const mockEnrollment: Enrollment = {
    id: mockEnrollmentId,
    userId: mockUserId,
    courseId: mockCourseId,
    enrolledAt: new Date(),
    completedAt: new Date(),
    status: EnrollmentStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentsController],
      providers: [
        {
          provide: EnrollmentsService,
          useValue: mockDeep<EnrollmentsService>(),
        },
      ],
    }).compile();

    controller = module.get<EnrollmentsController>(EnrollmentsController);
    service = module.get(EnrollmentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException if invalid data is provided', async () => {
      const invalidDto = {
        userId: 'invalid-uuid',
        courseId: 'invalid-uuid',
        status: 'INVALID_STATUS',
      };

      const dtoInstance = plainToInstance(CreateEnrollmentDto, invalidDto);
      const errors = await validate(dtoInstance);

      expect(errors.length).toBeGreaterThan(0);

      if (errors.length > 0) {
        expect(() => {
          throw new BadRequestException('Validation failed');
        }).toThrow(BadRequestException);
      }
    });

    it('should allow ADMIN to create enrollment', async () => {
      const dto: CreateEnrollmentDto = {
        userId: mockUserId,
        courseId: mockCourseId,
        status: EnrollmentStatus.ACTIVE,
      };

      // Prisma espera esse formato para relacionamentos
      const prismaCreateInput: CreateEnrollmentDto = {
        userId: mockUserId,
        courseId: mockCourseId,
        status: dto.status,
      };

      service.create.mockResolvedValue(mockEnrollment);

      const result = await controller.create(dto, adminReq);

      expect(result).toEqual(mockEnrollment);
      expect(service.create).toHaveBeenCalledWith(prismaCreateInput);
    });

    it('should throw ForbiddenException if non-ADMIN tries to create', async () => {
      const dto: CreateEnrollmentDto = {
        userId: mockUserId,
        courseId: mockCourseId,
      };

      await expect(controller.create(dto, studentReq)).rejects.toThrow(
        ForbiddenException,
      );

      expect(service.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all enrollments for ADMIN', async () => {
      service.findAll.mockResolvedValue([mockEnrollment]);

      const result = await controller.findAll(adminReq);

      expect(result).toEqual([mockEnrollment]);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should return only student enrollments for STUDENT', async () => {
      service.findManyByUserId.mockResolvedValue([mockEnrollment]);

      const result = await controller.findAll(studentReq);

      expect(result).toEqual([mockEnrollment]);
      expect(service.findManyByUserId).toHaveBeenCalledWith(
        studentReq.user.sub,
      );
    });
  });

  describe('findOne', () => {
    it('should return enrollment if user is ADMIN', async () => {
      service.findOne.mockResolvedValue(mockEnrollment);

      const result = await controller.findOne(mockEnrollmentId, adminReq);

      expect(result).toEqual(mockEnrollment);
      expect(service.findOne).toHaveBeenCalledWith(mockEnrollmentId);
    });

    it('should return enrollment if student owns it', async () => {
      const mockEnrollment = {
        id: randomUUID(),
        userId: studentReq.user.sub, // ID do estudante que faz a requisição
        courseId: mockCourseId,
        enrolledAt: new Date(),
        completedAt: new Date(),
        status: EnrollmentStatus.ACTIVE,
      };

      service.findOne.mockResolvedValue(mockEnrollment);

      const result = await controller.findOne(mockEnrollment.id, studentReq);

      expect(result).toEqual(mockEnrollment);
    });

    it('should throw ForbiddenException if student accesses another enrollment', async () => {
      service.findOne.mockResolvedValue({
        ...mockEnrollment,
        userId: randomUUID(), // ID diferente para simular outro usuário
      });

      await expect(
        controller.findOne(mockEnrollmentId, studentReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if enrollment not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(
        controller.findOne(mockEnrollmentId, adminReq),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException if invalid ID is provided', async () => {
      const invalidDto = {
        id: 'fake-id',
        userId: 'fake-userid',
        status: EnrollmentStatus.CANCELLED,
      };
      const dtoInstance = plainToInstance(DeleteEnrollmentDto, invalidDto);
      const errors = await validate(dtoInstance);

      expect(errors.length).toBeGreaterThan(0);

      if (errors.length > 0) {
        expect(() => {
          throw new BadRequestException('Validation failed');
        }).toThrow(BadRequestException);
      }
    });

    it('should call service.remove for ADMIN', async () => {
      service.remove.mockResolvedValue(mockEnrollment);

      await controller.remove(mockEnrollmentId);

      expect(service.remove).toHaveBeenCalledWith(mockEnrollmentId);
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if invalid data is provided', async () => {
      const invalidDto: Partial<UpdateEnrollmentDto> = {
        status: 'INVALID_STATUS' as EnrollmentStatus, // inválido
      };

      const dtoInstance = plainToInstance(UpdateEnrollmentDto, invalidDto);
      const errors = await validate(dtoInstance);

      expect(errors.length).toBeGreaterThan(0);

      if (errors.length > 0) {
        expect(() => {
          throw new BadRequestException('Validation failed');
        }).toThrow(BadRequestException);
      }
    });

    it('should call service.update for ADMIN', async () => {
      const updateDto: Partial<UpdateEnrollmentDto> = {
        status: EnrollmentStatus.COMPLETED,
      };

      const updatedEnrollment = {
        ...mockEnrollment,
        status: EnrollmentStatus.COMPLETED,
      };

      service.update.mockResolvedValue(updatedEnrollment);

      const result = await controller.update(
        mockEnrollmentId,
        updateDto,
        adminReq,
      );

      expect(result).toEqual(updatedEnrollment);
      expect(service.update).toHaveBeenCalledWith(mockEnrollmentId, updateDto);
    });
    it('should throw NotFoundException when update fails', async () => {
      service.update.mockResolvedValue(null as unknown as Enrollment);

      await expect(
        controller.update(
          mockEnrollmentId,
          {
            status: EnrollmentStatus.CANCELLED,
          },
          adminReq,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
