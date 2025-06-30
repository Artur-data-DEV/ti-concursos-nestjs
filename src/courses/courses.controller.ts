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
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import { Roles } from '../auth/roles.decorator/roles.decorator';
import { UserRole } from '@prisma/client';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Esquema de validação para criação e atualização de cursos
const courseSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório.'),
  description: z.string().min(1, 'A descrição é obrigatória.'),
  instructorId: z.string().min(1, 'O ID do instrutor é obrigatório.'),
  thumbnail: z.string().url('URL da thumbnail inválida.').optional().nullable(),
  price: z
    .number()
    .positive('O preço deve ser um número positivo.')
    .optional()
    .nullable(),
  isPublished: z.boolean().optional(),
});

// Esquema de validação para o ID (usado em PUT e DELETE)
const idSchema = z.object({
  id: z.string().uuid().min(1, 'O ID é obrigatório.'),
});

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

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
    @Query('title') title?: string,
    @Query('instructorId') instructorId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const token = req.user;

    if (!token) {
      throw new ForbiddenException('Não autenticado.');
    }

    const filters = {
      title,
      instructorId,
      limit,
      offset,
    };

    return this.coursesService.findAll(filters);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Post()
  async create(@Body() createCourseDto: any, @Request() req: any) {
    const token = req.user;

    const parsedBody = courseSchema.safeParse(createCourseDto);

    if (!parsedBody.success) {
      throw new BadRequestException({
        message: 'Dados inválidos',
        errors: this.handleZodError(parsedBody.error),
      });
    }

    // O instrutor do curso deve ser o usuário logado, a menos que seja ADMIN
    if (token.role !== 'ADMIN' && parsedBody.data.instructorId !== token.sub) {
      throw new ForbiddenException(
        'Não autorizado a criar curso para outro instrutor.',
      );
    }

    return this.coursesService.create(parsedBody.data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: any,
    @Request() req: any,
  ) {
    const token = req.user;

    if (!token) {
      throw new ForbiddenException('Não autenticado.');
    }

    const parsedId = idSchema.safeParse({ id });

    if (!parsedId.success) {
      throw new BadRequestException({
        message: 'ID inválido ou ausente',
        errors: this.handleZodError(parsedId.error),
      });
    }

    const parsedCourseData = courseSchema.safeParse(updateCourseDto);

    if (!parsedCourseData.success) {
      throw new BadRequestException({
        message: 'Dados inválidos para atualização',
        errors: this.handleZodError(parsedCourseData.error),
      });
    }

    const existingCourse = await this.coursesService.findOne(parsedId.data.id);

    if (!existingCourse) {
      throw new NotFoundException('Curso não encontrado para atualização.');
    }

    // Apenas PROFESSOR e ADMIN podem atualizar cursos, ou o instrutor do curso
    if (
      token.role !== 'ADMIN' &&
      !(token.role === 'PROFESSOR' && token.sub === existingCourse.instructorId)
    ) {
      throw new ForbiddenException('Não autorizado.');
    }

    try {
      return await this.coursesService.update(
        parsedId.data.id,
        parsedCourseData.data,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Curso não encontrado para atualização.');
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const token = req.user;

    if (!token) {
      throw new ForbiddenException('Não autenticado.');
    }

    const parsedId = idSchema.safeParse({ id });

    if (!parsedId.success) {
      throw new BadRequestException({
        message: 'ID inválido ou ausente',
        errors: this.handleZodError(parsedId.error),
      });
    }

    const existingCourse = await this.coursesService.findOne(parsedId.data.id);

    if (!existingCourse) {
      throw new NotFoundException('Curso não encontrado para exclusão.');
    }

    // Apenas ADMIN pode deletar cursos, ou o instrutor do curso
    if (token.role !== 'ADMIN' && token.sub !== existingCourse.instructorId) {
      throw new ForbiddenException('Não autorizado.');
    }

    try {
      await this.coursesService.remove(parsedId.data.id);
      return { message: 'Curso deletado com sucesso.' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Curso não encontrado para exclusão.');
      }
      throw error;
    }
  }
}
