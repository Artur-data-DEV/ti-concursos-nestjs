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
} from '@nestjs/common';
import { AnswerAttemptsService } from './answer-attempts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { CreateAnswerAttemptDto } from './dto/create-answer-attempt.dto';
import { UpdateAnswerAttemptDto } from './dto/update-answer-attempt.dto';
import { FindAttemptFilterDto } from './dto/answer-attempts-filters.dto';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';
import { Roles } from '../../src/auth/roles.decorator/roles.decorator';
import { RolesGuard } from '../../src/auth/roles.guard/roles.guard';

@Controller('answer-attempts')
export class AnswerAttemptsController {
  constructor(private readonly answerAttemptsService: AnswerAttemptsService) {}

  /*** GET - LISTAR TENTATIVAS ***/
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STUDENT', 'TEACHER')
  @Get()
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: FindAttemptFilterDto,
  ) {
    const { user } = req;

    if (!user) throw new ForbiddenException('Não autenticado.');
    if (user.role !== 'ADMIN') {
      if (query.userId && query.userId !== user.sub) {
        throw new ForbiddenException('Não autorizado.');
      }
      // Se o STUDENT não passou userId, force ele a ver só as próprias tentativas
      query.userId = user.sub;
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STUDENT')
  @Patch(':id')
  async update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() updateDto: UpdateAnswerAttemptDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const { user } = req;

    if (!user) {
      throw new ForbiddenException('Não autenticado.');
    }

    if (id !== updateDto.id) {
      throw new BadRequestException(
        'ID do parâmetro não bate com o corpo da requisição.',
      );
    }

    const attempt = await this.answerAttemptsService.findOne(id);
    if (!attempt) {
      throw new NotFoundException('Tentativa de resposta não encontrada.');
    }

    if (user.role === 'ADMIN') {
      return await this.answerAttemptsService.update(id, updateDto);
    }

    if (user.sub !== attempt.answer.userId) {
      throw new ForbiddenException(
        'Não autorizado. Tentativa de resposta não pertence ao usuário.',
      );
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STUDENT')
  @Delete(':id')
  async remove(
    @Param('id', ParseCuidPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const { user } = req;
    if (!user) throw new ForbiddenException('Não autenticado.');

    const attempt = await this.answerAttemptsService.findOne(id);
    if (!attempt) {
      throw new NotFoundException('Tentativa de resposta não encontrada.');
    }

    if (user.role !== 'ADMIN') {
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
