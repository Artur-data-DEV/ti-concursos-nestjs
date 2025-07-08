/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AnswersService } from './answers.service';
import { randomUUID } from 'crypto';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Answer } from '@prisma/client';
import { CreateAnswerDto } from './dto/create-answer.dto';

describe('AnswersService', () => {
  let service: AnswersService;
  let prismaService: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnswersService,
        {
          provide: PrismaService,
          useValue: mockDeep<PrismaService>(),
        },
      ],
    }).compile();

    service = module.get<AnswersService>(AnswersService);
    prismaService = module.get<PrismaService, DeepMockProxy<PrismaService>>(
      PrismaService,
    );

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create answer', async () => {
      const data: CreateAnswerDto = {
        userId: randomUUID(),
        questionId: randomUUID(),
        selectedOption: 'A',
      };

      const createdAnswer = { id: randomUUID(), ...data } as Answer;
      prismaService.answer.create.mockResolvedValue(createdAnswer);

      const result = await service.create(data);

      expect(prismaService.answer.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(createdAnswer);
    });

    it('should throw if prisma.create fails', async () => {
      prismaService.answer.create.mockRejectedValue(
        new Error('Prisma create error'),
      );

      await expect(
        service.create({
          userId: 'x',
          questionId: 'y',
          selectedOption: 'A',
        }),
      ).rejects.toThrow('Prisma create error');
    });
  });

  describe('findOne', () => {
    it('should return answer by id', async () => {
      const id = 'answer-id';
      const answer = { id, userId: 'uuid', questionId: 'uuid' } as Answer;
      prismaService.answer.findUnique.mockResolvedValue(answer);

      const result = await service.findOne(id);

      expect(prismaService.answer.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toEqual(answer);
    });

    it('should return null if not found', async () => {
      prismaService.answer.findUnique.mockResolvedValue(null);

      const result = await service.findOne('not-exist');

      expect(result).toBeNull();
    });
  });
});
