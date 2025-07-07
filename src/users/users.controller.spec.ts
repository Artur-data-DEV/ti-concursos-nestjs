import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from '../common/interfaces/authenticated-request.interface';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUserId = randomUUID();
  const mockAdminId = randomUUID();

  const mockUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: 'STUDENT',
  };

  const mockAdminUser = {
    id: mockAdminId,
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'hashedpassword',
    role: 'ADMIN',
  };

  const mockPrismaService = {
    user: {
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
      controllers: [UsersController],
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return a list of users for ADMIN', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([mockUser, mockAdminUser]);

      const result = await controller.findAll(mockAuthenticatedAdminRequest);

      expect(result).toEqual([mockUser, mockAdminUser]);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return user by ID for ADMIN', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await controller.findAll(mockAuthenticatedAdminRequest, mockUserId);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
    });

    it('should return own profile for STUDENT', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await controller.findAll(mockAuthenticatedStudentRequest, mockUserId);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: mockUserId } });
    });

    it('should throw ForbiddenException for STUDENT accessing other user profile', async () => {
      await expect(
        controller.findAll(mockAuthenticatedStudentRequest, mockAdminId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for non-ADMIN listing all users', async () => {
      await expect(controller.findAll(mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(controller.findAll(mockAuthenticatedAdminRequest, 'invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(controller.findAll(mockAuthenticatedAdminRequest, randomUUID())).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createUserDto = {
      name: 'New User',
      email: 'newuser@example.com',
      password: 'password123',
      role: 'STUDENT',
    };

    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = {
        name: "",
        email: "invalid-email",
        password: "123",
        role: "INVALID_ROLE",
      };

      await expect(controller.create(invalidDto)).rejects.toThrow(BadRequestException);
    });

    it("should create user for ADMIN", async () => {
      const createdUser = { id: randomUUID(), ...createUserDto };
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({ data: createUserDto });
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = {
        name: '',
        email: 'invalid-email',
        password: '123',
        role: 'INVALID_ROLE',
      };

      await expect(controller.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Updated Name' };

    it('should update user for ADMIN', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUserId, updateDto, mockAuthenticatedAdminRequest);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: updateDto,
      });
    });

    it('should update own profile for STUDENT', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUserId, updateDto, mockAuthenticatedStudentRequest);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: updateDto,
      });
    });

    it("should throw BadRequestException for invalid ID", async () => {
      await expect(
        controller.update("invalid-id", updateDto, mockAuthenticatedAdminRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for invalid data", async () => {
      const invalidDto = { email: "invalid-email" };

      await expect(
        controller.update(mockUserId, invalidDto, mockAuthenticatedAdminRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when user not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(controller.update(randomUUID(), updateDto, mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for STUDENT updating other user", async () => {
      await expect(
        controller.update(mockAdminId, updateDto, mockAuthenticatedStudentRequest),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete user for ADMIN', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await controller.remove(mockUserId, mockAuthenticatedAdminRequest);

      expect(result).toEqual({ message: 'Usuário deletado com sucesso.' });
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({ where: { id: mockUserId } });
    });

    it('should delete own account for STUDENT', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await controller.remove(mockUserId, mockAuthenticatedStudentRequest);

      expect(result).toEqual({ message: 'Usuário deletado com sucesso.' });
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({ where: { id: mockUserId } });
    });

    it("should throw BadRequestException for invalid ID", async () => {
      await expect(controller.remove("invalid-id", mockAuthenticatedAdminRequest)).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when user not found", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(controller.remove(randomUUID(), mockAuthenticatedAdminRequest)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for STUDENT deleting other user", async () => {
      await expect(controller.remove(mockAdminId, mockAuthenticatedStudentRequest)).rejects.toThrow(ForbiddenException);
    });
  });
});
