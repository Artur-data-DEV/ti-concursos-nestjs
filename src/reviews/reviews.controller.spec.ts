import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: ReviewsService;

  const mockReviewId = randomUUID();
  const mockUserId = randomUUID();
  const mockCourseId = randomUUID();
  const mockAdminId = randomUUID();
  const mockStudentId = randomUUID();

  const mockReview = {
    id: mockReviewId,
    userId: mockUserId,
    courseId: mockCourseId,
    rating: 5,
    comment: 'Great course!',
    createdAt: new Date(),
  };

  const mockPrismaService = {
    review: {
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
      controllers: [ReviewsController],
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of reviews for any authenticated user', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([mockReview]);

      const result = await controller.findAll(mockAuthenticatedStudentRequest);

      expect(result).toEqual([mockReview]);
      expect(mockPrismaService.review.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return review by ID for any authenticated user', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      const result = await controller.findAll(
        mockAuthenticatedStudentRequest,
        mockReviewId,
      );

      expect(result).toEqual(mockReview);
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: { id: mockReviewId },
      });
    });

    it('should throw BadRequestException for invalid review ID', async () => {
      await expect(
        controller.findAll(mockAuthenticatedStudentRequest, 'invalid-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(
        controller.findAll(mockAuthenticatedStudentRequest, randomUUID()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const filters = {
        userId: randomUUID(),
        courseId: randomUUID(),
        rating: '4',
        limit: '10',
        offset: '0',
      };

      await controller.findAll(
        mockAuthenticatedStudentRequest,
        undefined,
        filters.userId,
        filters.courseId,
        filters.rating,
        filters.limit,
        filters.offset,
      );

      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: filters.userId,
            courseId: filters.courseId,
            rating: parseInt(filters.rating),
          },
          take: 10,
          skip: 0,
        }),
      );
    });
  });

  describe('create', () => {
    const createReviewDto = {
      userId: mockUserId,
      courseId: mockCourseId,
      rating: 4,
      comment: 'Good course',
    };

    it('should create review for STUDENT for themselves', async () => {
      const createdReview = {
        id: randomUUID(),
        ...createReviewDto,
        createdAt: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue({ id: mockUserId });
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: mockCourseId,
      });
      mockPrismaService.review.create.mockResolvedValue(createdReview);

      const result = await controller.create(
        createReviewDto,
        mockAuthenticatedStudentRequest,
      );

      expect(result).toEqual(createdReview);
      expect(mockPrismaService.review.create).toHaveBeenCalledWith({
        data: createReviewDto,
      });
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { ...createReviewDto, rating: 6 };
      await expect(
        controller.create(invalidDto, mockAuthenticatedStudentRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for STUDENT creating review for another user', async () => {
      const otherUserId = randomUUID();
      const otherStudentRequest = {
        user: { sub: otherUserId, role: 'STUDENT' },
      } as AuthenticatedRequest;

      await expect(
        controller.create(createReviewDto, otherStudentRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.course.findUnique.mockResolvedValue({
        id: mockCourseId,
      });

      await expect(
        controller.create(createReviewDto, mockAuthenticatedStudentRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if course not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: mockUserId });
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        controller.create(createReviewDto, mockAuthenticatedStudentRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = { rating: 5, comment: 'Excellent course!' };

    it('should update review for ADMIN', async () => {
      const updatedReview = { ...mockReview, ...updateDto };
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue(updatedReview);

      const result = await controller.update(mockReviewId, updateDto);

      expect(result).toEqual(updatedReview);
      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: mockReviewId },
        data: updateDto,
      });
    });

    it('should update own review for STUDENT', async () => {
      const updatedReview = { ...mockReview, ...updateDto };
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue(updatedReview);

      const result = await controller.update(mockReviewId, updateDto);

      expect(result).toEqual(updatedReview);
      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: mockReviewId },
        data: updateDto,
      });
    });

    it('should throw ForbiddenException for STUDENT updating other user review', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        ...mockReview,
        userId: randomUUID(),
      });

      await expect(
        controller.update(
          mockReviewId,
          updateDto,
          mockAuthenticatedStudentRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { rating: 6 };
      await expect(
        controller.update(
          mockReviewId,
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

    it('should throw NotFoundException when review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(
        controller.update(
          randomUUID(),
          updateDto,
          mockAuthenticatedAdminRequest,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete review for ADMIN', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.delete.mockResolvedValue(mockReview);

      const result = await controller.remove(mockReviewId);

      expect(result).toEqual({ message: 'Review deleted' });
      expect(mockPrismaService.review.delete).toHaveBeenCalledWith({
        where: { id: mockReviewId },
      });
    });

    it('should delete own review for STUDENT', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.delete.mockResolvedValue(mockReview);

      const result = await controller.remove(mockReviewId);

      expect(result).toEqual({ message: 'Review deleted' });
      expect(mockPrismaService.review.delete).toHaveBeenCalledWith({
        where: { id: mockReviewId },
      });
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(
        controller.remove('invalid-id', mockAuthenticatedAdminRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for STUDENT deleting other user review', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue({
        ...mockReview,
        userId: randomUUID(),
      });

      await expect(
        controller.remove(mockReviewId, mockAuthenticatedStudentRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(
        controller.remove(randomUUID(), mockAuthenticatedAdminRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
