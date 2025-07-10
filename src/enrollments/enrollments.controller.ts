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
  ForbiddenException,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import { Roles } from '../auth/roles.decorator/roles.decorator';
import { UserRole, EnrollmentStatus } from '@prisma/client';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(
    @Body() createEnrollmentDto: CreateEnrollmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'No momento somente administradores podem criar inscrições',
      );
    }
    console.log(
      `Admin ${req.user.sub} criando matrícula para usuário ${createEnrollmentDto.userId}`,
    );

    const data = {
      userId: createEnrollmentDto.userId,
      courseId: createEnrollmentDto.courseId,
      status: createEnrollmentDto.status || EnrollmentStatus.ACTIVE,
    };
    return this.enrollmentsService.create(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    if (req.user.role === UserRole.ADMIN) {
      return this.enrollmentsService.findAll();
    } else if (req.user.role === UserRole.STUDENT) {
      return this.enrollmentsService.findManyByUserId(req.user.sub);
    }
    return [];
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const enrollment = await this.enrollmentsService.findOne(id);

    if (!enrollment) {
      throw new NotFoundException('Matrícula não encontrada');
    }

    if (
      req.user.role === UserRole.STUDENT &&
      enrollment.userId !== req.user.sub
    ) {
      throw new ForbiddenException('Acesso negado');
    }

    return enrollment;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Não autorizado.');
    }
    const updated = await this.enrollmentsService.update(
      id,
      updateEnrollmentDto,
    );
    console.log(updated, 'que ta sendo atualizado');
    if (!updated) {
      throw new NotFoundException('Matrícula não encontrada');
    }
    return updated;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const removed = await this.enrollmentsService.remove(id);
    if (!removed) {
      throw new NotFoundException('Matrícula não encontrada');
    }
    return removed;
  }
}
