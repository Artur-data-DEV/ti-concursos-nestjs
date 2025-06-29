import { Test, TestingModule } from '@nestjs/testing';
import { AnswerAttemptsController } from './answer-attempts.controller';
import { AnswerAttemptsService } from './answer-attempts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnswerAttemptsController', () => {
  let controller: AnswerAttemptsController;
  let service: AnswerAttemptsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnswerAttemptsController],
      providers: [AnswerAttemptsService, PrismaService],
    }).compile();

    controller = module.get<AnswerAttemptsController>(AnswerAttemptsController);
    service = module.get<AnswerAttemptsService>(AnswerAttemptsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});


