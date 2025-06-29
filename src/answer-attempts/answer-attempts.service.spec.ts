import { Test, TestingModule } from "@nestjs/testing";
import { AnswerAttemptsService } from "./answer-attempts.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AnswerAttemptsService", () => {
  let service: AnswerAttemptsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnswerAttemptsService, PrismaService],
    }).compile();

    service = module.get<AnswerAttemptsService>(AnswerAttemptsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});


