import { Test, TestingModule } from '@nestjs/testing';
import { ModulesController } from './modules.controller';
import { ModulesService } from './modules.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ModulesController', () => {
  let controller: ModulesController;
  let service: ModulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModulesController],
      providers: [ModulesService, PrismaService],
    }).compile();

    controller = module.get<ModulesController>(ModulesController);
    service = module.get<ModulesService>(ModulesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
