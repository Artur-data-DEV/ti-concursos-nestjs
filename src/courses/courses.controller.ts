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
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import { Roles } from '../auth/roles.decorator/roles.decorator';
import { Course, UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ParseCuidPipe } from '../../src/common/pipes/parse-cuid.pipe';

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
  ): Promise<Course[]> {
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
  @Roles(UserRole.ADMIN, UserRole.STUDENT, UserRole.TEACHER)
  @Get(':id')
  async findOne(
    @Param('id', ParseCuidPipe) id: string,
  ): Promise<Course | null> {
    const course = await this.coursesService.findOne(id);

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
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
      title: data.title,
      description: data.description,
      isPublished: data.isPublished,
      price: data.price,
      thumbnail: data.thumbnail,
      instructorId: data.instructorId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() body: UpdateCourseDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Não autenticado.');
    }

    const data = body;

    const existingCourse = await this.coursesService.findOne(id);
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
      return await this.coursesService.update(id, data);
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
    @Param('id', ParseCuidPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Não autenticado.');
    }

    const existingCourse = await this.coursesService.findOne(id);

    if (!existingCourse) {
      throw new NotFoundException('Curso não encontrado para exclusão.');
    }

    if (user.role !== 'ADMIN' && user.sub !== existingCourse.instructorId) {
      throw new ForbiddenException('Não autorizado a excluir este curso.');
    }

    try {
      await this.coursesService.remove(id);
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
