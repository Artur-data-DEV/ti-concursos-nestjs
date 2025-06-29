import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

jest.mock('bcryptjs');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'STUDENT',
      };

      const hashedPassword = 'hashedPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const createdUser = { id: randomUUID(), ...userData };
      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: userData.name,
          email: userData.email,
          role: userData.role,
          secure: {
            create: { password: hashedPassword },
          },
        },
      });
      expect(result).toEqual(createdUser);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: randomUUID(), name: 'User 1', email: 'user1@example.com' },
        { id: randomUUID(), name: 'User 2', email: 'user2@example.com' },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const userId = randomUUID();
      const mockUser = { id: userId, name: 'Test User', email: 'test@example.com' };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOneByEmail', () => {
    it('should return user by email', async () => {
      const email = 'test@example.com';
      const mockUser = { id: randomUUID(), name: 'Test User', email };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOneByEmail(email);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: { secure: true },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update user with hashed password', async () => {
      const userId = randomUUID();
      const updateData = {
        name: 'Updated Name',
        password: 'newPassword123',
      };

      const hashedPassword = 'hashedNewPassword123';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const updatedUser = { id: userId, ...updateData };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateData);

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          name: updateData.name,
          secure: {
            update: { password: hashedPassword },
          },
        },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should update user without password', async () => {
      const userId = randomUUID();
      const updateData = {
        name: 'Updated Name',
      };

      const updatedUser = { id: userId, ...updateData };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateData);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      const userId = randomUUID();
      const deletedUser = { id: userId, name: 'Deleted User' };

      mockPrismaService.user.delete.mockResolvedValue(deletedUser);

      const result = await service.remove(userId);

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual(deletedUser);
    });
  });
});

