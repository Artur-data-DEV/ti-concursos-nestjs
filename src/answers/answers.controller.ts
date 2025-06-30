import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { AnswersService } from './answers.service';
import { ZodError, z } from 'zod';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { CreateAnswerDto } from './answers.dto';

const createAnswerSchema = z.object({
  userId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedOption: z.string().optional(),
  textAnswer: z.string().nullable().optional(),
  isCorrect: z.boolean().optional(),
  timeSpentSeconds: z.number().int().min(0).optional(),
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
  async create(
    @Body() body: CreateAnswerDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Não autenticado.');
    }

    const result = createAnswerSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos para criação da resposta.',
        errors: this.handleZodError(result.error),
      });
    }

    const data = result.data;

    const isAdmin = user.role === 'ADMIN';

    // Apenas ADMIN pode responder por outro userId
    if (!isAdmin && user.sub !== data.userId) {
      throw new ForbiddenException(
        'Você só pode criar respostas para sua própria conta.',
      );
    }

    return this.answersService.create(data);
  }
}
