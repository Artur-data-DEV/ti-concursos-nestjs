import { adminReq, studentReq } from '../__mocks__/user_mocks';
import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './enrollments.dto';
import { randomUUID } from 'crypto';
import { EnrollmentStatus } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
describe('EnrollmentsController', () => {
  let controller: EnrollmentsController;
  let service: EnrollmentsService;

  const mockEnrollmentId = randomUUID();
  const mockUserId = randomUUID();
  const mockCourseId = randomUUID();

  const mockEnrollment = {
    id: mockEnrollmentId,
    userId: mockUserId,
    courseId: mockCourseId,
    enrolledAt: new Date(),
    status: EnrollmentStatus.ACTIVE,
  };

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findManyByUserId: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentsController],
      providers: [
        {
          provide: EnrollmentsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<EnrollmentsController>(EnrollmentsController);
    service = module.get<EnrollmentsService>(EnrollmentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should throw BadRequestException if invalid data is provided", async () => {
      const invalidDto = {
        userId: "invalid-uuid",
        courseId: "invalid-uuid",
        status: "INVALID_STATUS",
      };
      await expect(controller.create(invalidDto as CreateEnrollmentDto, adminReq)).rejects.toThrow(BadRequestException);
    });

    it("should allow ADMIN to create enrollment", async () => {
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

      mockService.create.mockResolvedValue(mockEnrollment);

      const result = await controller.create(dto, adminReq);

      expect(result).toEqual(mockEnrollment);
      expect(mockService.create).toHaveBeenCalledWith(prismaCreateInput);
    });

    it('should throw ForbiddenException if non-ADMIN tries to create', async () => {
      const dto: CreateEnrollmentDto = {
        userId: mockUserId,
        courseId: mockCourseId,
      };

      await expect(controller.create(dto, studentReq)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockService.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all enrollments for ADMIN', async () => {
      mockService.findAll.mockResolvedValue([mockEnrollment]);

      const result = await controller.findAll(adminReq);

      expect(result).toEqual([mockEnrollment]);
      expect(mockService.findAll).toHaveBeenCalled();
    });

    it('should return only student enrollments for STUDENT', async () => {
      mockService.findManyByUserId.mockResolvedValue([mockEnrollment]);

      const result = await controller.findAll(studentReq);

      expect(result).toEqual([mockEnrollment]);
      expect(mockService.findManyByUserId).toHaveBeenCalledWith(
        studentReq.user.sub,
      );
    });
  });

  describe('findOne', () => {
    it('should return enrollment if user is ADMIN', async () => {
      mockService.findOne.mockResolvedValue(mockEnrollment);

      const result = await controller.findOne(mockEnrollmentId, adminReq);

      expect(result).toEqual(mockEnrollment);
      expect(mockService.findOne).toHaveBeenCalledWith(mockEnrollmentId);
    });

    it('should return enrollment if student owns it', async () => {
      const mockEnrollment = {
        id: randomUUID(),
        userId: studentReq.user.sub, // ID do estudante que faz a requisição
        courseId: mockCourseId,
        enrolledAt: new Date(),
      };

      mockService.findOne.mockResolvedValue(mockEnrollment);

      const result = await controller.findOne(mockEnrollment.id, studentReq);

      expect(result).toEqual(mockEnrollment);
    });

    it('should throw ForbiddenException if student accesses another enrollment', async () => {
      mockService.findOne.mockResolvedValue({
        ...mockEnrollment,
        userId: randomUUID(), // ID diferente para simular outro usuário
      });

      await expect(
        controller.findOne(mockEnrollmentId, studentReq),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if enrollment not found', async () => {
      mockService.findOne.mockResolvedValue(null);

      await expect(
        controller.findOne(mockEnrollmentId, adminReq),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should throw BadRequestException if invalid ID is provided", async () => {
      await expect(controller.remove("invalid-id")).rejects.toThrow(BadRequestException);
    });

    it("should call service.remove for ADMIN", async () => {
      mockService.remove.mockResolvedValue(true);

      await controller.remove(mockEnrollmentId);

      expect(mockService.remove).toHaveBeenCalledWith(mockEnrollmentId);
    });
  });

  describe("update", () => {
    it("should throw BadRequestException if invalid data is provided", async () => {
      const invalidDto: Partial<UpdateEnrollmentDto> = {
        status: "INVALID_STATUS" as EnrollmentStatus,
      };
      await expect(controller.update(mockEnrollmentId, invalidDto, adminReq)).rejects.toThrow(BadRequestException);
    });

    it("should call service.update for ADMIN", async () => {
      const updateDto: Partial<UpdateEnrollmentDto> = {
        status: EnrollmentStatus.COMPLETED,
      };

      const updatedEnrollment = {
        ...mockEnrollment,
        status: EnrollmentStatus.COMPLETED,
      };

      mockService.update.mockResolvedValue(updatedEnrollment);

      const result = await controller.update(mockEnrollmentId, updateDto);

      expect(result).toEqual(updatedEnrollment);
      expect(mockService.update).toHaveBeenCalledWith(
        mockEnrollmentId,
        updateDto,
      );
    });
    it('should throw NotFoundException when update fails', async () => {
      mockService.update.mockResolvedValue(null);

      await expect(
        controller.update(mockEnrollmentId, {
          status: EnrollmentStatus.CANCELLED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
