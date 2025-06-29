import { Test, TestingModule } from "@nestjs/testing";
import { ModulesService } from "./modules.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ModulesService", () => {
  let service: ModulesService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModulesService, PrismaService],
    }).compile();

    service = module.get<ModulesService>(ModulesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});


