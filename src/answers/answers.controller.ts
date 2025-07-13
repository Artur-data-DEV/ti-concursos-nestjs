import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { AnswersService } from './answers.service';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { Roles } from '../auth/roles.decorator/roles.decorator';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import { UserRole } from '@prisma/client';

@Controller('answers')
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Post()
  async create(
    @Body() body: CreateAnswerDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Não autenticado.');
    }

    const isAdmin = user.role === 'ADMIN';

    // Apenas ADMIN pode responder por outro userId
    if (!isAdmin && user.sub !== body.userId) {
      throw new ForbiddenException(
        'Você só pode criar respostas para sua própria conta.',
      );
    }

    return this.answersService.create(body);
  }
}
