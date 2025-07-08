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
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import { Roles } from '../auth/roles.decorator/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateLessonDto } from './create-lesson.dto';
import { UpdateLessonDto } from './update-lesson.dto';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  /**
   * Criar lição (Admin ou Professor dono do módulo)
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async create(dto: CreateLessonDto, req: AuthenticatedRequest) {
    if (req.user.role === UserRole.STUDENT) {
      throw new ForbiddenException('Estudantes não podem criar lições.');
    }

    if (req.user.role === UserRole.TEACHER) {
      const moduleExists = await this.lessonsService.findExistentModule(
        dto.moduleId,
      );
      if (!moduleExists) throw new NotFoundException('Módulo não encontrado');

      const isOwner = await this.lessonsService.isTeacherOwnerOfModule(
        req.user.sub,
        dto.moduleId,
      );
      if (!isOwner) {
        throw new ForbiddenException(
          'Você não tem permissão para criar lições neste módulo.',
        );
      }
    }

    return this.lessonsService.create(dto);
  }

  /**
   * Listar lições:
   * - ADMIN vê tudo
   * - STUDENT precisa passar courseId (lições disponíveis para ele)
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('courseId') courseId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Usuário não autenticado');

    if (user.role === UserRole.STUDENT) {
      if (!courseId) {
        throw new BadRequestException(
          'Alunos devem informar o parâmetro "courseId".',
        );
      }

      return this.lessonsService.findAvailableLessonsForStudent(
        user.sub,
        courseId,
      );
    }

    return this.lessonsService.findAll({
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
    });
  }

  /**
   * Buscar lição por ID:
   * - Admin vê qualquer
   * - Student só se tiver acesso
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Usuário não autenticado');

    const lesson = await this.lessonsService.findOne(id);
    if (!lesson) throw new NotFoundException('Lição não encontrada');

    if (
      user.role === UserRole.STUDENT &&
      !(await this.lessonsService.studentHasAccessToLesson(
        user.sub,
        lesson.moduleId,
      ))
    ) {
      throw new ForbiddenException('Você não tem acesso a esta lição');
    }

    return lesson;
  }

  /**
   * Atualizar lição (Admin ou Professor dono do módulo)
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLessonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Usuário não autenticado');
    if (user.role === UserRole.STUDENT) {
      throw new ForbiddenException('Estudantes não podem atualizar lições.');
    }
    const lesson = await this.lessonsService.findOne(id);
    if (!lesson) throw new NotFoundException('Lição não encontrada');

    if (
      user.role === UserRole.TEACHER &&
      !(await this.lessonsService.isTeacherOwnerOfModule(
        user.sub,
        lesson.moduleId,
      ))
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar esta lição.',
      );
    }

    return this.lessonsService.update(id, dto);
  }

  /**
   * Remover lição (apenas Admin)
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Usuário não autenticado');

    if (user.role === UserRole.STUDENT || user.role === UserRole.TEACHER) {
      throw new ForbiddenException(
        'Apenas ADMIN pode apagar aulas de um módulo.',
      );
    }
    const lesson = await this.lessonsService.findOne(id);
    if (!lesson) throw new NotFoundException('Lição não encontrada');

    await this.lessonsService.remove(id);
    return { message: 'Lição removida com sucesso' };
  }
}
