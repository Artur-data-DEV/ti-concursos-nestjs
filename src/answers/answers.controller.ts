import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AnswersService } from './answers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { z, ZodError } from 'zod';

const answerSchema = z.object({
  userId: z.string(),
  questionId: z.string(),
  selectedOption: z.string().optional(),
  textAnswer: z.string().nullable().optional(),
  isCorrect: z.boolean().optional(),
  timeSpentSeconds: z.number().optional(),
});

@Controller('answers')
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  private handleZodError(error: ZodError) {
    return error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createAnswerDto: any, @Request() req: any) {
    const token = req.user;

    if (!token) {
      throw new ForbiddenException('Não autenticado.');
    }

    const result = answerSchema.safeParse(createAnswerDto);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos para criação da resposta.',
        errors: this.handleZodError(result.error),
      });
    }

    // Um usuário só pode criar uma resposta para si mesmo, a menos que seja ADMIN
    if (token.role !== 'ADMIN' && token.sub !== result.data.userId) {
      throw new ForbiddenException('Não autorizado.');
    }

    return this.answersService.create(result.data);
  }
}

