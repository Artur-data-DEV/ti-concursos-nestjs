/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '@prisma/client';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findOneByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        PrismaService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data without secure if password matches', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        secure: {
          password: 'hashedPassword',
          userId: '1', // Adicione isso aqui
        },
        // demais propriedades do usuário que sua função espera...
      } as unknown as User & { secure: { password: string; userId: string } };

      usersService.findOneByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        emailVerified: user.emailVerified,
        image: user.image,
        bio: user.bio,
        socialLinks: user.socialLinks,
        secure: user.secure,
      });
    });

    it('should return null if password does not match', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        secure: {
          password: 'hashedPassword',
          userId: '1', // Adicione isso aqui
        },
        // demais propriedades do usuário que sua função espera...
      } as unknown as User & { secure: { password: string; userId: string } };

      usersService.findOneByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null if user not found', async () => {
      usersService.findOneByEmail.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access_token with correct payload', () => {
      const user: Pick<User, 'id' | 'email' | 'role'> = {
        id: '1',
        email: 'test@example.com',
        role: UserRole.STUDENT,
      };

      jwtService.sign.mockReturnValue('mockAccessToken');

      const result = service.login(user);

      expect(result).toEqual({ access_token: 'mockAccessToken' });
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        sub: user.id,
        role: user.role,
      });
    });
  });
});
