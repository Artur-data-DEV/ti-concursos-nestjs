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
import { FavoriteQuestionsService } from './favorite-questions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import { Roles } from '../auth/roles.decorator/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import {
  FavoriteQuestionDto,
  UpdateFavoriteQuestionDto,
} from './favorite-questions.dto';
import { ParseUUIDPipe } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { FindQuestionsFiltersDto } from './favorite-questions-filter.dto';

@Controller('favorite-questions')
export class FavoriteQuestionsController {
  constructor(
    private readonly favoriteQuestionsService: FavoriteQuestionsService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Post()
  async create(
    @Body() createFavoriteQuestionDto: FavoriteQuestionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (
      !isUUID(createFavoriteQuestionDto.userId) ||
      !isUUID(createFavoriteQuestionDto.questionId)
    ) {
      throw new BadRequestException('Invalid userId or questionId format');
    }
    const user = await this.favoriteQuestionsService.findUser(
      createFavoriteQuestionDto.userId,
    );
    const question = await this.favoriteQuestionsService.findQuestionById(
      createFavoriteQuestionDto.questionId,
    );

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (
      req.user.role === UserRole.ADMIN ||
      req.user.sub === createFavoriteQuestionDto.userId
    ) {
      return this.favoriteQuestionsService.create({
        user: { connect: { id: createFavoriteQuestionDto.userId } },
        question: { connect: { id: createFavoriteQuestionDto.questionId } },
        markedAt: new Date(),
      });
    }

    throw new ForbiddenException(
      'You can only create favorite questions for yourself.',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Get()
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() filters?: FindQuestionsFiltersDto, // Aqui você vai pegar os filtros da query string
  ) {
    // Se o filtro for passado, aplica o filtro
    if (filters) {
      return this.favoriteQuestionsService.findAll(filters);
    }

    // Caso o usuário seja ADMIN, retorna todos os favoritos
    if (req.user.role === UserRole.ADMIN) {
      return this.favoriteQuestionsService.findAll();
    }

    // Caso o usuário seja STUDENT, retorna os favoritos do próprio usuário
    return this.favoriteQuestionsService.findManyByUserId(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Get(':userId/:questionId')
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    if (!isUUID(userId) || !isUUID(questionId)) {
      throw new BadRequestException('Invalid userId or questionId format');
    }
    const favoriteQuestion = await this.favoriteQuestionsService.findOne({
      userId_questionId: { userId, questionId },
    });

    if (!favoriteQuestion) {
      throw new NotFoundException('Favorite question not found');
    }

    return favoriteQuestion;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Patch(':userId/:questionId')
  async update(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Request() req: AuthenticatedRequest,
    @Body() updateFavoriteQuestionDto: UpdateFavoriteQuestionDto,
  ) {
    if (req.user.role === UserRole.ADMIN || userId === req.user.sub) {
      return this.favoriteQuestionsService.update(
        { userId_questionId: { userId, questionId } },
        updateFavoriteQuestionDto,
      );
    }

    throw new ForbiddenException(
      'You can only update your own favorite questions.',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Delete(':userId/:questionId')
  async remove(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!isUUID(userId) || !isUUID(questionId)) {
      throw new BadRequestException('Invalid userId or questionId format');
    }
    const favoriteQuestion = await this.favoriteQuestionsService.findOne({
      userId_questionId: { userId, questionId },
    });

    if (!favoriteQuestion) {
      throw new NotFoundException('Favorite question not found');
    }

    if (req.user.role === UserRole.ADMIN || userId === req.user.sub) {
      await this.favoriteQuestionsService.remove({
        userId_questionId: { userId, questionId },
      });
      return { message: 'Favorite question deleted' };
    }

    throw new ForbiddenException(
      'You can only delete your own favorite questions.',
    );
  }
}
