import { Test, TestingModule } from "@nestjs/testing";
import { ReviewsService } from "./reviews.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ReviewsService", () => {
  let service: ReviewsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService, PrismaService],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});


