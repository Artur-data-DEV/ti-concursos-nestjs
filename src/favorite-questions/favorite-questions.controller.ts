import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from "@nestjs/common";
import { FavoriteQuestionsService } from "./favorite-questions.service";
import { Prisma } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard/roles.guard";
import { Roles } from "../auth/roles.decorator/roles.decorator";
import { UserRole } from "@prisma/client";

@Controller("favorite-questions")
export class FavoriteQuestionsController {
  constructor(private readonly favoriteQuestionsService: FavoriteQuestionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Post()
  create(@Body() createFavoriteQuestionDto: Prisma.FavoriteQuestionCreateInput) {
    return this.favoriteQuestionsService.create(createFavoriteQuestionDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Get()
  findAll(@Request() req: any) {
    if (req.user.role === UserRole.ADMIN) {
      return this.favoriteQuestionsService.findAll();
    } else if (req.user.role === UserRole.STUDENT) {
      return this.favoriteQuestionsService.findManyByUserId(req.user.userId);
    } else {
      return [];
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Get(":userId/:questionId")
  findOne(@Param("userId") userId: string, @Param("questionId") questionId: string) {
    return this.favoriteQuestionsService.findOne({ userId_questionId: { userId, questionId } });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Patch(":userId/:questionId")
  update(
    @Param("userId") userId: string,
    @Param("questionId") questionId: string,
    @Body() updateFavoriteQuestionDto: Prisma.FavoriteQuestionUpdateInput,
  ) {
    return this.favoriteQuestionsService.update(
      { userId_questionId: { userId, questionId } },
      updateFavoriteQuestionDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  @Delete(":userId/:questionId")
  remove(@Param("userId") userId: string, @Param("questionId") questionId: string) {
    return this.favoriteQuestionsService.remove({ userId_questionId: { userId, questionId } });
  }
}


