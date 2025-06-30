import { Test, TestingModule } from '@nestjs/testing';
import { FavoriteQuestionsService } from './favorite-questions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FavoriteQuestionsService', () => {
  let service: FavoriteQuestionsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FavoriteQuestionsService, PrismaService],
    }).compile();

    service = module.get<FavoriteQuestionsService>(FavoriteQuestionsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
