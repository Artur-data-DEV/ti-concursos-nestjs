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
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AnswerAttemptsService } from './answer-attempts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { CreateAnswerAttemptDto } from './dto/create-answer-attempt.dto';
import { UpdateAnswerAttemptDto } from './dto/update-answer-attempt.dto';
import { AttemptFilterDto } from './dto/answer-attempts-filters.dto';

@Controller('answer-attempts')
export class AnswerAttemptsController {
  constructor(private readonly answerAttemptsService: AnswerAttemptsService) {}

  /*** GET - LISTAR TENTATIVAS ***/
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: AttemptFilterDto,
  ) {
    const { user } = req;

    if (!user) throw new ForbiddenException('Não autenticado.');

    if (user.role !== 'ADMIN') {
      if (!query.userId || query.userId !== user.sub) {
        throw new ForbiddenException('Não autorizado.');
      }
    }

    return this.answerAttemptsService.findAll(query);
  }

  /*** POST - CRIAR TENTATIVA ***/
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createDto: CreateAnswerAttemptDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const { user } = req;
    if (!user) throw new ForbiddenException('Não autenticado.');

    const answer = await this.answerAttemptsService.findAnswer(
      createDto.answerId,
    );

    if (!answer) {
      throw new NotFoundException('Resposta não encontrada.');
    }

    if (user.role !== 'ADMIN' && user.sub !== answer.userId) {
      throw new ForbiddenException('Não autorizado.');
    }

    return this.answerAttemptsService.create(createDto);
  }

  /*** PATCH - ATUALIZAR TENTATIVA ***/
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateAnswerAttemptDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const { user } = req;
    if (!user) throw new ForbiddenException('Não autenticado.');

    if (id !== updateDto.id) {
      throw new BadRequestException(
        'ID do parâmetro não bate com o corpo da requisição.',
      );
    }

    const attempt = await this.answerAttemptsService.findOne(id);
    if (!attempt) {
      throw new NotFoundException('Tentativa de resposta não encontrada.');
    }

    if (user.role !== 'ADMIN' && user.sub !== attempt.answer.userId) {
      throw new ForbiddenException('Não autorizado.');
    }

    try {
      return await this.answerAttemptsService.update(id, updateDto);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Tentativa de resposta não encontrada para atualização.',
        );
      }
      throw new Error('Erro interno ao atualizar tentativa de resposta.');
    }
  }

  /*** DELETE - REMOVER TENTATIVA ***/
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const { user } = req;
    if (!user) throw new ForbiddenException('Não autenticado.');

    const attempt = await this.answerAttemptsService.findOne(id);
    if (!attempt) {
      throw new NotFoundException('Tentativa de resposta não encontrada.');
    }

    if (user.role !== 'ADMIN' && user.sub !== attempt.answer.userId) {
      throw new ForbiddenException('Não autorizado.');
    }

    try {
      await this.answerAttemptsService.remove(id);
      return { message: 'Tentativa de resposta deletada com sucesso.' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Tentativa não encontrada para exclusão.');
      }
      throw new Error('Erro interno ao excluir tentativa de resposta.');
    }
  }
}
