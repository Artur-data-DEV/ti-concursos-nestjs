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

// Schemas
const answerAttemptCreateSchema = z.object({
  answerId: z.string().uuid().min(1, 'O ID da resposta é obrigatório.'),
  isCorrect: z.boolean(),
  timeSpent: z
    .number()
    .int()
    .min(0, 'O tempo gasto deve ser um número inteiro inteiro positivo.')
    .optional()
    .nullable(),
});

const answerAttemptUpdateSchema = answerAttemptCreateSchema.extend({
  id: z
    .string()
    .uuid()
    .min(1, 'O ID da tentativa de resposta é obrigatório para atualização.'),
});

const idSchema = z.object({
  id: z.string().uuid().min(1, 'O ID é obrigatório.'),
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
    @Request() req: any,
    @Query('userId') userId?: string,
    @Query('questionId') questionId?: string,
    @Query('isCorrect') isCorrect?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const token = req.user;

    if (!token) {
      throw new ForbiddenException('Não autenticado.');
    }

    if (userId && token.role !== 'ADMIN' && token.sub !== userId) {
      throw new ForbiddenException('Não autorizado.');
    }

    if (token.role !== 'ADMIN' && !userId) {
      throw new ForbiddenException('Não autorizado.');
    }

    const filters = {
      userId,
      questionId,
      isCorrect,
      limit,
      offset,
    };

    return this.answerAttemptsService.findAll(filters);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createAnswerAttemptDto: any, @Request() req: any) {
    const token = req.user;

    if (!token) {
      throw new ForbiddenException('Não autenticado.');
    }

    const result = answerAttemptCreateSchema.safeParse(createAnswerAttemptDto);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos para criação da tentativa de resposta.',
        errors: this.handleZodError(result.error),
      });
    }

    const data = result.data;

    const answer = await this.answerAttemptsService.findAnswer(data.answerId);

    if (!answer) {
      throw new NotFoundException('Resposta não encontrada.');
    }

    if (token.role !== 'ADMIN' && token.sub !== answer.userId) {
      throw new ForbiddenException('Não autorizado.');
    }

    return this.answerAttemptsService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param("id") id: string,
    @Body() updateAnswerAttemptDto: any,
    @Request() req: any,
  ) {
    const token = req.user;

    if (!token) {
      throw new ForbiddenException('Não autenticado.');
    }

    if (!id) {
      throw new BadRequestException(
        'ID da tentativa de resposta inválido ou ausente.',
      );
    }

    const parsedId = idSchema.safeParse({ id });
    if (!parsedId.success) {
      throw new BadRequestException({
        message: 'ID da tentativa de resposta inválido.',
        errors: this.handleZodError(parsedId.error),
      });
    }

    const result = answerAttemptUpdateSchema.safeParse(updateAnswerAttemptDto);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos para atualização da tentativa de resposta.',
        errors: this.handleZodError(result.error),
      });
    }

    const existingAttempt = await this.answerAttemptsService.findOne(
      parsedId.data.id,
    );

    if (!existingAttempt) {
      throw new NotFoundException('Tentativa de resposta não encontrada.');
    }

    if (token.role !== 'ADMIN' && token.sub !== existingAttempt.answer.userId) {
      throw new ForbiddenException('Não autorizado.');
    }

    try {
      return await this.answerAttemptsService.update(
        parsedId.data.id,
        result.data,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Tentativa de resposta não encontrada para atualização.',
        );
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param("id") id: string, @Request() req: any) {
    const token = req.user;

    if (!token) {
      throw new ForbiddenException('Não autenticado.');
    }

    if (!id) {
      throw new BadRequestException('ID é obrigatório para exclusão.');
    }

    const parsedId = idSchema.safeParse({ id });
    if (!parsedId.success) {
      throw new BadRequestException({
        message: 'ID da tentativa de resposta inválido.',
        errors: this.handleZodError(parsedId.error),
      });
    }

    const existingAttempt = await this.answerAttemptsService.findOne(
      parsedId.data.id,
    );

    if (!existingAttempt) {
      throw new NotFoundException('Tentativa de resposta não encontrada.');
    }

    if (token.role !== 'ADMIN' && token.sub !== existingAttempt.answer.userId) {
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
      throw error;
    }
  }
}

