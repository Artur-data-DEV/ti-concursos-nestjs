import { Test, TestingModule } from "@nestjs/testing";
import { CoursesService } from "./courses.service";
import { PrismaService } from "../prisma/prisma.service";

describe("CoursesService", () => {
  let service: CoursesService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoursesService, PrismaService],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});


