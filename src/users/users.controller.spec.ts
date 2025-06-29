import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

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
    const mockAdminId = randomUUID();
    const mockStudentId = randomUUID();

    it('should return list of users for ADMIN', async () => {
      const mockUsers = [
        { id: mockAdminId, name: 'Admin User', role: 'ADMIN' },
        { id: mockStudentId, name: 'Student User', role: 'STUDENT' },
      ];

      mockUsersService.findAll.mockResolvedValue(mockUsers);

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      const result = await controller.findAll(req);

      expect(result).toEqual(mockUsers);
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });

    it('should return user by ID for ADMIN', async () => {
      const mockUser = { id: mockStudentId, name: 'Student User', role: 'STUDENT' };

      mockUsersService.findOne.mockResolvedValue(mockUser);

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      const result = await controller.findAll(req, mockStudentId);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockStudentId);
    });

    it('should return own profile for STUDENT', async () => {
      const mockUser = { id: mockStudentId, name: 'Student User', role: 'STUDENT' };

      mockUsersService.findOne.mockResolvedValue(mockUser);

      const req = {
        user: { sub: mockStudentId, role: 'STUDENT' },
      };

      const result = await controller.findAll(req, mockStudentId);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockStudentId);
    });

    it('should throw ForbiddenException for STUDENT accessing other user profile', async () => {
      const req = {
        user: { sub: mockStudentId, role: 'STUDENT' },
      };

      await expect(controller.findAll(req, mockAdminId)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for non-ADMIN listing all users', async () => {
      const req = {
        user: { sub: mockStudentId, role: 'STUDENT' },
      };

      await expect(controller.findAll(req)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      await expect(controller.findAll(req, 'invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      await expect(controller.findAll(req, mockStudentId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const mockAdminId = randomUUID();

    it('should create user for ADMIN', async () => {
      const createUserDto = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        role: 'STUDENT',
      };

      const createdUser = { id: randomUUID(), ...createUserDto };
      mockUsersService.create.mockResolvedValue(createdUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
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
    const mockAdminId = randomUUID();
    const mockStudentId = randomUUID();

    it('should update user for ADMIN', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedUser = { id: mockStudentId, name: 'Updated Name' };

      mockUsersService.update.mockResolvedValue(updatedUser);

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      const result = await controller.update(mockStudentId, updateDto, req);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.update).toHaveBeenCalledWith(mockStudentId, updateDto);
    });

    it('should update own profile for STUDENT', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedUser = { id: mockStudentId, name: 'Updated Name' };

      mockUsersService.update.mockResolvedValue(updatedUser);

      const req = {
        user: { sub: mockStudentId, role: 'STUDENT' },
      };

      const result = await controller.update(mockStudentId, updateDto, req);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.update).toHaveBeenCalledWith(mockStudentId, updateDto);
    });

    it('should throw ForbiddenException for STUDENT updating other user', async () => {
      const updateDto = { name: 'Updated Name' };

      const req = {
        user: { sub: mockStudentId, role: 'STUDENT' },
      };

      await expect(controller.update(mockAdminId, updateDto, req)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      const updateDto = { name: 'Updated Name' };

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      await expect(controller.update('invalid-id', updateDto, req)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid data', async () => {
      const invalidDto = { email: 'invalid-email' };

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      await expect(controller.update(mockStudentId, invalidDto, req)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    const mockAdminId = randomUUID();
    const mockStudentId = randomUUID();

    it('should delete user for ADMIN', async () => {
      mockUsersService.remove.mockResolvedValue({ id: mockStudentId });

      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      const result = await controller.remove(mockStudentId, req);

      expect(result).toEqual({ message: 'Usuário deletado com sucesso.' });
      expect(mockUsersService.remove).toHaveBeenCalledWith(mockStudentId);
    });

    it('should delete own account for STUDENT', async () => {
      mockUsersService.remove.mockResolvedValue({ id: mockStudentId });

      const req = {
        user: { sub: mockStudentId, role: 'STUDENT' },
      };

      const result = await controller.remove(mockStudentId, req);

      expect(result).toEqual({ message: 'Usuário deletado com sucesso.' });
      expect(mockUsersService.remove).toHaveBeenCalledWith(mockStudentId);
    });

    it('should throw ForbiddenException for STUDENT deleting other user', async () => {
      const req = {
        user: { sub: mockStudentId, role: 'STUDENT' },
      };

      await expect(controller.remove(mockAdminId, req)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      const req = {
        user: { sub: mockAdminId, role: 'ADMIN' },
      };

      await expect(controller.remove('invalid-id', req)).rejects.toThrow(BadRequestException);
    });
  });
});

