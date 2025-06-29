import { Test, TestingModule } from "@nestjs/testing";
import { AnswersService } from "./answers.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AnswersService", () => {
  let service: AnswersService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnswersService, PrismaService],
    }).compile();

    service = module.get<AnswersService>(AnswersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});


