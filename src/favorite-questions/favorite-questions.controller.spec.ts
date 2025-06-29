import { Test, TestingModule } from "@nestjs/testing";
import { FavoriteQuestionsController } from "./favorite-questions.controller";
import { FavoriteQuestionsService } from "./favorite-questions.service";
import { PrismaService } from "../prisma/prisma.service";

describe("FavoriteQuestionsController", () => {
  let controller: FavoriteQuestionsController;
  let service: FavoriteQuestionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoriteQuestionsController],
      providers: [FavoriteQuestionsService, PrismaService],
    }).compile();

    controller = module.get<FavoriteQuestionsController>(FavoriteQuestionsController);
    service = module.get<FavoriteQuestionsService>(FavoriteQuestionsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});


