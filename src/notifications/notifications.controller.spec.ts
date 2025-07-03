import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationId = randomUUID();
  const mockUserId = randomUUID();
  const mockAdminId = randomUUID();
  const mockStudentId = randomUUID();

  const mockNotification = {
    id: mockNotificationId,
    userId: mockUserId,
    message: 'Test Notification',
    read: false,
    createdAt: new Date(),
  };

  const mockPrismaService = {
    notification: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
      controllers: [NotificationsController],
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of notifications for ADMIN', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotification]);

      const result = await controller.findAll(mockAuthenticatedAdminRequest);

      expect(result).toEqual([mockNotification]);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return notification by ID for ADMIN', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);

      const result = await controller.findOne(mockNotificationId);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.findUnique).toHaveBeenCalledWith({ where: { id: mockNotificationId } });
    });

    it('should return own notifications for STUDENT', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotification]);

      const result = await controller.findAll(mockAuthenticatedStudentRequest);

      expect(result).toEqual([mockNotification]);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId: mockUserId,
        },
      }));
    });

    it('should return specific notification for STUDENT if it belongs to them', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);

      const result = await controller.findOne(mockNotificationId);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.findUnique).toHaveBeenCalledWith({ where: { id: mockNotificationId } });
    });

    it('should throw ForbiddenException for STUDENT accessing other user notification', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue({ ...mockNotification, userId: randomUUID() });

      await expect(controller.findAll(mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(controller.findAll(mockAuthenticatedAdminRequest, 'invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await expect(controller.findAll(mockAuthenticatedAdminRequest, randomUUID())).rejects.toThrow(NotFoundException);
    });

    it('should apply filters when provided', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      const filters = {
        userId: randomUUID(),
        read: true,
        limit: '10',
        offset: '0',
      };

      await controller.findAll(
        mockAuthenticatedAdminRequest,
        undefined,
        filters.userId,
        filters.read,
        filters.limit,
        filters.offset,
      );

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          userId: filters.userId,
          read: filters.read,
        },
        take: 10,
        skip: 0,
      }));
    });
  });

  describe('create', () => {
    const createNotificationDto = {
      userId: mockUserId,
      message: 'New Notification',
    };

    it('should create notification for ADMIN', async () => {
      const createdNotification = { id: randomUUID(), ...createNotificationDto, read: false, createdAt: new Date() };
      mockPrismaService.notification.create.mockResolvedValue(createdNotification);

      const result = await controller.create(createNotificationDto);

      expect(result).toEqual(createdNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({ data: createNotificationDto });
    });

    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = { ...createNotificationDto, userId: 'invalid-id' };
      await expect(controller.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException for STUDENT", async () => {
      await expect(controller.create(createNotificationDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto = { read: true };

    it('should update notification for ADMIN', async () => {
      const updatedNotification = { ...mockNotification, ...updateDto };
      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue(updatedNotification);

      const result = await controller.update(mockNotificationId, updateDto);

      expect(result).toEqual(updatedNotification);
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({ where: { id: mockNotificationId }, data: updateDto });
    });

    it('should update own notification for STUDENT', async () => {
      const updatedNotification = { ...mockNotification, ...updateDto };
      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue(updatedNotification);

      const result = await controller.update(mockNotificationId, updateDto);

      expect(result).toEqual(updatedNotification);
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({ where: { id: mockNotificationId }, data: updateDto });
    });

    it('should throw ForbiddenException for STUDENT updating other user notification', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue({ ...mockNotification, userId: randomUUID() });

      await expect(controller.update(mockNotificationId, updateDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(controller.update("invalid-id", updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { read: 'invalid' };
      await expect(controller.update(mockNotificationId, invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await expect(controller.update(randomUUID(), updateDto, mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete notification for ADMIN', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.delete.mockResolvedValue(mockNotification);

      const result = await controller.remove(mockNotificationId);

      expect(result).toEqual({ message: 'Notification deleted' });
      expect(mockPrismaService.notification.delete).toHaveBeenCalledWith({ where: { id: mockNotificationId } });
    });

    it('should delete own notification for STUDENT', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.delete.mockResolvedValue(mockNotification);

      const result = await controller.remove(mockNotificationId);

      expect(result).toEqual({ message: 'Notification deleted' });
      expect(mockPrismaService.notification.delete).toHaveBeenCalledWith({ where: { id: mockNotificationId } });
    });

    it('should throw ForbiddenException for STUDENT deleting other user notification', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue({ ...mockNotification, userId: randomUUID() });

      await expect(controller.remove(mockNotificationId, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(controller.remove('invalid-id', mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await expect(controller.remove(randomUUID(), mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });
  });
});