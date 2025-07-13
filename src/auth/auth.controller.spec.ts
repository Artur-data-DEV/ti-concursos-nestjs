/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User, UserRole } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: null,
    image: null,
    role: UserRole.STUDENT,
    bio: null,
    socialLinks: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    // ... qualquer outra propriedade que User tenha
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn().mockReturnValue({ access_token: 'mockToken' }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login and return an access token', () => {
      const req = { user: mockUser };
      const result = controller.login(req);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ access_token: 'mockToken' });
    });
  });
});
