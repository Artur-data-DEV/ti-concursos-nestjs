import { Test, TestingModule } from "@nestjs/testing";
import { TagsService } from "./tags.service";
import { PrismaService } from "../prisma/prisma.service";

describe("TagsService", () => {
  let service: TagsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TagsService, PrismaService],
    }).compile();

    service = module.get<TagsService>(TagsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});


