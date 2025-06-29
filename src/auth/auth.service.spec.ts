import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import * as bcrypt from "bcryptjs";

jest.mock("bcryptjs");

describe("AuthService", () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

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
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("validateUser", () => {
    it("should return user if password matches", async () => {
      const user = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        secure: { password: "hashedPassword" },
      };
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        "test@example.com",
        "password"
      );
      expect(result).toEqual({ id: user.id, email: user.email, name: user.name });
    });

    it("should return null if password does not match", async () => {
      const user = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        secure: { password: "hashedPassword" },
      };
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        "test@example.com",
        "password"
      );
      expect(result).toBeNull();
    });

    it("should return null if user not found", async () => {
      (usersService.findOneByEmail as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser(
        "test@example.com",
        "password"
      );
      expect(result).toBeNull();
    });
  });

  describe("login", () => {
    it("should return access_token", async () => {
      const user = {
        id: "1",
        email: "test@example.com",
        name: "Test User",
        role: "STUDENT",
      };
      (jwtService.sign as jest.Mock).mockReturnValue("mockAccessToken");

      const result = await service.login(user);
      expect(result).toEqual({ access_token: "mockAccessToken" });
      expect(jwtService.sign).toHaveBeenCalledWith({ email: user.email, sub: user.id, role: user.role });
    });
  });
});


