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
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import { Roles } from '../auth/roles.decorator/roles.decorator';
import { UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { CreateCourseDto, IdParamDto, UpdateCourseDto } from './courses.dto';
import { isUUID } from 'class-validator';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('title') title?: string,
    @Query('instructorId') instructorId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Não autenticado.');
    }

    return this.coursesService.findAll({
      title,
      instructorId,
      limit,
      offset,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @Post()
  async create(
    @Body() body: CreateCourseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const data = body;

    if (user.role !== 'ADMIN' && data.instructorId !== user.sub) {
      throw new ForbiddenException(
        'Não autorizado a criar curso para outro instrutor.',
      );
    }

    return this.coursesService.create({
      ...data,
      instructor: { connect: { id: data.instructorId } },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') params: IdParamDto,
    @Body() body: UpdateCourseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Não autenticado.');
    }

    const data = body;

    const existingCourse = await this.coursesService.findOne(params.id);
    if (!existingCourse) {
      throw new NotFoundException('Curso não encontrado para atualização.');
    }

    if (
      user.role !== 'ADMIN' &&
      !(user.role === 'TEACHER' && user.sub === existingCourse.instructorId)
    ) {
      throw new ForbiddenException('Não autorizado a editar este curso.');
    }

    try {
      return await this.coursesService.update(params.id, data);
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
  async remove(
    @Param('id') params: IdParamDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!isUUID(params.id)) {
      throw new BadRequestException('ID inválido.');
    }
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Não autenticado.');
    }

    const existingCourse = await this.coursesService.findOne(params.id);

    if (!existingCourse) {
      throw new NotFoundException('Curso não encontrado para exclusão.');
    }

    if (user.role !== 'ADMIN' && user.sub !== existingCourse.instructorId) {
      throw new ForbiddenException('Não autorizado a excluir este curso.');
    }

    try {
      await this.coursesService.remove(params.id);
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
