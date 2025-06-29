import { Test, TestingModule } from '@nestjs/testing';
import { AnswersController } from './answers.controller';
import { AnswersService } from './answers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnswersController', () => {
  let controller: AnswersController;
  let service: AnswersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnswersController],
      providers: [AnswersService, PrismaService],
    }).compile();

    controller = module.get<AnswersController>(AnswersController);
    service = module.get<AnswersService>(AnswersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});


