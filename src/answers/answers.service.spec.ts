import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AnswersService } from './answers.service';
import { randomUUID } from 'crypto';
import { CreateAnswerDto } from './answers.dto';

describe('AnswersService', () => {
  let service: AnswersService;

  const mockPrisma: {
    answer: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
  } = {
    answer: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnswersService,
        {
          provide: PrismaService,
          useValue: mockPrisma, // Injeta o mock do PrismaService
        },
      ],
    }).compile();

    service = module.get<AnswersService>(AnswersService);
    jest.clearAllMocks(); // Limpa todos os mocks para garantir que os testes sejam independentes
  });

  describe('create', () => {
    it('should create answer', async () => {
      const data: CreateAnswerDto = {
        userId: randomUUID(),
        questionId: randomUUID(),
        selectedOption: 'A',
      };

      const createdAnswer = { id: randomUUID(), ...data };
      mockPrisma.answer.create.mockResolvedValue(createdAnswer); // Mocka o retorno da criação

      const result = await service.create(data); // Chama o método que deve usar o Prisma

      // Verifica se a função create do Prisma foi chamada corretamente
      expect(mockPrisma.answer.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(createdAnswer); // Verifica se o retorno está correto
    });

    it('should throw if prisma.create fails', async () => {
      mockPrisma.answer.create.mockRejectedValue(
        new Error('Prisma create error'),
      ); // Mocka falha

      // Verifica se o erro é lançado corretamente quando o Prisma falha
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
      const answer = { id, userId: 'uuid', questionId: 'uuid' };
      mockPrisma.answer.findUnique.mockResolvedValue(answer); // Mocka a busca no Prisma

      const result = await service.findOne(id); // Chama o método que deve usar o Prisma

      expect(mockPrisma.answer.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toEqual(answer); // Verifica se o retorno está correto
    });

    it('should return null if not found', async () => {
      mockPrisma.answer.findUnique.mockResolvedValue(null); // Mocka a não existência da resposta

      const result = await service.findOne('not-exist'); // Chama com id inexistente

      expect(result).toBeNull(); // Verifica se o resultado é null
    });
  });
});
