import { Test, TestingModule } from '@nestjs/testing';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('EnrollmentsController', () => {
  let controller: EnrollmentsController;
  let service: EnrollmentsService;

  const mockEnrollmentId = randomUUID();
  const mockUserId = randomUUID();
  const mockCourseId = randomUUID();
  const mockAdminId = randomUUID();

  const mockEnrollment = {
    id: mockEnrollmentId,
    userId: mockUserId,
    courseId: mockCourseId,
    enrollmentDate: new Date(),
    status: 'ACTIVE',
  };

  const mockPrismaService = {
    enrollment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
  };

  const mockAuthenticatedAdminRequest: AuthenticatedRequest = {
    user: {
      sub: mockAdminId,
      role: 'ADMIN',
    },
  } as AuthenticatedRequest;

  const mockAuthenticatedStudentRequest: AuthenticatedRequest = {
    user: {
      sub: mockUserId,
      role: 'STUDENT',
    },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentsController],
      providers: [
        EnrollmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<EnrollmentsController>(EnrollmentsController);
    service = module.get<EnrollmentsService>(EnrollmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of enrollments for ADMIN', async () => {
      mockPrismaService.enrollment.findMany.mockResolvedValue([mockEnrollment]);

      const result = await controller.findAll(mockAuthenticatedAdminRequest);

      expect(result).toEqual([mockEnrollment]);
      expect(mockPrismaService.enrollment.findMany).toHaveBeenCalledTimes(1);
    });
    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = { userId: "invalid-uuid", courseId: "invalid-uuid", status: "INVALID" as Prisma.EnumEnrollmentStatusNames };
      const req = mockAuthenticatedAdminRequest;

      await expect(controller.create(invalidDto, req)).rejects.toThrow(BadRequestException);
    });

    it("should create enrollment for ADMIN", async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue(mockEnrollment);

      const result = await controller.findOne(mockEnrollmentId);

      expect(result).toEqual(mockEnrollment);
      expect(mockPrismaService.enrollment.findUnique).toHaveBeenCalledWith({ where: { id: mockEnrollmentId } });
    });

    it('should return own enrollments for STUDENT', async () => {
      mockPrismaService.enrollment.findMany.mockResolvedValue([mockEnrollment]);

      const result = await controller.findAll(mockAuthenticatedStudentRequest);

      expect(result).toEqual([mockEnrollment]);
      expect(mockPrismaService.enrollment.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId: mockUserId,
        },
      }));
    });

    it('should return specific enrollment for STUDENT if it belongs to them', async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue(mockEnrollment);

      const result = await controller.findOne(mockEnrollmentId);

      expect(result).toEqual(mockEnrollment);
      expect(mockPrismaService.enrollment.findUnique).toHaveBeenCalledWith({ where: { id: mockEnrollmentId } });
    });

    it("should throw ForbiddenException for STUDENT accessing other user enrollment", async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue({ ...mockEnrollment, userId: randomUUID() });

      await expect(controller.findOne(mockEnrollmentId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(controller.findOne("invalid-id")).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when enrollment not found', async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue(null);

      await expect(controller.findOne(randomUUID())).rejects.toThrow(NotFoundException);
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.enrollment.findMany.mockResolvedValue([]);

      const filters = {
        userId: randomUUID(),
        courseId: randomUUID(),
        status: 'ACTIVE',
        limit: '10',
        offset: '0',
      };

      await controller.findAll(
        mockAuthenticatedAdminRequest,
        filters.userId,
        filters.courseId,
        filters.status,
        filters.limit,
        filters.offset,
      );

      expect(mockPrismaService.enrollment.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId: filters.userId,
          courseId: filters.courseId,
          status: filters.status,
        },
        take: 10,
        skip: 0,
      }));