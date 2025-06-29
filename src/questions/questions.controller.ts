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
import { QuestionsService } from './questions.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import { Roles } from '../auth/roles.decorator/roles.decorator';
import { UserRole } from '@prisma/client';
import { z, ZodError } from 'zod';

// Enums
const DifficultyEnum = z.enum(['FACIL', 'MEDIO', 'DIFICIL']);
const QuestionTypeEnum = z.enum([
  'MULTIPLA_ESCOLHA',
  'CERTO_ERRADO',
  'DISCURSIVA',
  'CODIGO',
]);

// Schemas
const optionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
  order: z.number().int(),
});

const questionBaseSchema = z.object({
  text: z.string().min(1),
  difficulty: DifficultyEnum,
  questionType: QuestionTypeEnum,
  topicId: z.string().min(1),
  subtopicId: z.string().min(1).optional(),
  bancaId: z.string().min(1).optional(),
  sourceConcurso: z.string().optional(),
  sourceCargo: z.string().optional(),
  sourceYear: z.number().int().optional(),
  sourceUrl: z.string().url().optional(),
  authorId: z.string().optional(),
  explanation: z.string().optional(),
  technologies: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  options: z.array(optionSchema).min(1).optional(),
});

const questionCreateSchema = questionBaseSchema.extend({
  topicId: z.string().min(1),
  subtopicId: z.string().min(1).optional(),
  bancaId: z.string().min(1).optional(),
  options: z.array(optionSchema).min(1),
});

const questionUpdateSchema = questionBaseSchema.extend({
  id: z.string().min(1),
});

const idSchema = z.object({ id: z.string().uuid().min(1) });

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

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
    @Query('id') id?: string,
    @Query('topicId') topicId?: string,
    @Query('subtopicId') subtopicId?: string,
    @Query('bancaId') bancaId?: string,
    @Query('technologyId') technologyId?: string,
    @Query('tagId') tagId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const token = req.user;

    if (!token) {
      throw new ForbiddenException('Não autenticado.');
    }

    const filters = {
      topicId,
      subtopicId,
      bancaId,
      technologyId,
      tagId,
      limit,
      offset,
    };

    if (id) {
      const parsedId = idSchema.safeParse({ id });
      if (!parsedId.success) {
        throw new BadRequestException({
          message: 'ID da questão inválido.',
          errors: this.handleZodError(parsedId.error),
        });
      }

      const question = await this.questionsService.findOne(
        parsedId.data.id,
        true,
      );
      if (!question) {
        throw new NotFoundException('Questão não encontrada');
      }
      return question;
    }

    return this.questionsService.findAll(filters);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Post()
  async create(@Body() createQuestionDto: any, @Request() req: any) {
    const token = req.user;

    const result = questionCreateSchema.safeParse(createQuestionDto);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid data: validation failed',
        errors: this.handleZodError(result.error),
      });
    }

    return this.questionsService.create(result.data, token.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateQuestionDto: any,
    @Request() req: any,
  ) {
    const token = req.user;

    if (!id) {
      throw new BadRequestException(
        "The field 'id' is required and must be a non-empty string",
      );
    }

    const dataWithId = { ...updateQuestionDto, id };
    const result = questionUpdateSchema.safeParse(dataWithId);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Invalid data: validation failed',
        errors: this.handleZodError(result.error),
      });
    }

    const existingQuestion = await this.questionsService.findOne(id, false);
    if (!existingQuestion) {
      throw new NotFoundException('Questão não encontrada.');
    }

    // Apenas PROFESSOR e ADMIN podem atualizar questões, ou o autor da questão
    if (
      token.role !== 'ADMIN' &&
      token.role !== 'PROFESSOR' &&
      token.sub !== existingQuestion.authorId
    ) {
      throw new ForbiddenException('Não autorizado.');
    }

    return this.questionsService.update(id, result.data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const token = req.user;

    const result = idSchema.safeParse({ id });
    if (!result.success) {
      throw new BadRequestException({
        message: "The field 'id' is required and must be a non-empty string",
        errors: this.handleZodError(result.error),
      });
    }

    const existingQuestion = await this.questionsService.findOne(id, false);
    if (!existingQuestion) {
      throw new NotFoundException('Questão não encontrada.');
    }

    // Apenas ADMIN pode deletar questões, ou o autor da questão
    if (token.role !== 'ADMIN' && token.sub !== existingQuestion.authorId) {
      throw new ForbiddenException('Não autorizado.');
    }

    await this.questionsService.remove(id);
    return { message: 'Question deleted' };
  }
}

