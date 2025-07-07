import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AnswerAttemptsService } from './answer-attempts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import {
  CreateAnswerAttemptDto,
  UpdateAnswerAttemptDto,
} from './answer-attempts.dto';

// Zod Schemas
const answerAttemptCreateSchema = z.object({
  answerId: z
    .string()
    .uuid({ message: 'O ID da resposta deve ser um UUID válido.' }),
  isCorrect: z.boolean(),
  timeSpent: z
    .number()
    .int('O tempo gasto deve ser um número inteiro.')
    .min(0, 'O tempo gasto deve ser maior ou igual a zero.')
    .nullable()
    .optional(),
  attemptAt: z.union([z.string().datetime(), z.date()]).optional().nullable(),
});

const answerAttemptUpdateSchema = answerAttemptCreateSchema.extend({
  id: z.string().uuid('O ID da tentativa deve ser um UUID válido.'),
});

const idSchema = z.object({
  id: z.string().uuid('O ID fornecido é inválido.'),
});

@Controller('answer-attempts')
export class AnswerAttemptsController {
  constructor(private readonly answerAttemptsService: AnswerAttemptsService) {}

  private handleZodError(error: ZodError) {
    return error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('userId') userId?: string,
    @Query('questionId') questionId?: string,
    @Query('isCorrect') isCorrect?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { user } = req;

    if (!user) throw new ForbiddenException('Não autenticado.');

    if (user.role !== 'ADMIN') {
      if (!userId || userId !== user.sub) {
        throw new ForbiddenException('Não autorizado.');
      }
    }

    return this.answerAttemptsService.findAll({
      userId,
      questionId,
      isCorrect,
      limit,
      offset,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createDto: CreateAnswerAttemptDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const { user } = req;

    if (!user) throw new ForbiddenException('Não autenticado.');

    const result = answerAttemptCreateSchema.safeParse(createDto);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos para criação da tentativa de resposta.',
        errors: this.handleZodError(result.error),
      });
    }

    const data = result.data;

    const answer = await this.answerAttemptsService.findAnswer(data.answerId);
    if (!answer) throw new NotFoundException('Resposta não encontrada.');

    if (user.role !== 'ADMIN' && user.sub !== answer.userId) {
      throw new ForbiddenException('Não autorizado.');
    }

    return this.answerAttemptsService.create({
      ...data,
      attemptAt: data.attemptAt ? new Date(data.attemptAt) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAnswerAttemptDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const { user } = req;

    if (!user) throw new ForbiddenException('Não autenticado.');

    const parsedId = idSchema.safeParse({ id });
    if (!parsedId.success) {
      throw new BadRequestException({
        message: 'ID da tentativa de resposta inválido.',
        errors: this.handleZodError(parsedId.error),
      });
    }

    const result = answerAttemptUpdateSchema.safeParse(updateDto);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos para atualização da tentativa de resposta.',
        errors: this.handleZodError(result.error),
      });
    }

    const attempt = await this.answerAttemptsService.findOne(parsedId.data.id);
    if (!attempt)
      throw new NotFoundException('Tentativa de resposta não encontrada.');

    if (user.role !== 'ADMIN' && user.sub !== attempt.answer.userId) {
      throw new ForbiddenException('Não autorizado.');
    }

    try {
      return await this.answerAttemptsService.update(parsedId.data.id, {
        ...result.data,
        attemptAt: result.data.attemptAt
          ? new Date(result.data.attemptAt)
          : undefined,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Tentativa de resposta não encontrada para atualização.',
        );
      }
      throw new Error(
        'Erro interno do servidor ao atualizar tentativa de resposta.',
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const { user } = req;

    if (!user) throw new ForbiddenException('Não autenticado.');

    const parsedId = idSchema.safeParse({ id });
    if (!parsedId.success) {
      throw new BadRequestException({
        message: 'ID da tentativa de resposta inválido.',
        errors: this.handleZodError(parsedId.error),
      });
    }

    const attempt = await this.answerAttemptsService.findOne(parsedId.data.id);
    if (!attempt)
      throw new NotFoundException('Tentativa de resposta não encontrada.');

    if (user.role !== 'ADMIN' && user.sub !== attempt.answer.userId) {
      throw new ForbiddenException('Não autorizado.');
    }

    try {
      await this.answerAttemptsService.remove(parsedId.data.id);
      return { message: 'Tentativa de resposta deletada com sucesso.' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Tentativa de resposta não encontrada para exclusão.',
        );
      }
      throw new Error(
        'Erro interno do servidor ao excluir tentativa de resposta.',
      );
    }
  }
}
