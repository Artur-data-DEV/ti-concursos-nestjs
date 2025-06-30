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
import { TopicsService } from './topics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import { Roles } from '../auth/roles.decorator/roles.decorator';
import { UserRole } from '@prisma/client';
import { z, ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Schemas
const topicCreateSchema = z.object({
  name: z.string().min(1, 'O nome do tópico é obrigatório.'),
});

const topicUpdateSchema = z.object({
  name: z.string().min(1, 'O nome do tópico é obrigatório.').optional(),
});

const idSchema = z.object({
  id: z.string().uuid('O ID deve ser um UUID válido.'),
});

@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  private handleZodError(error: ZodError) {
    return error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }

  @Get()
  async findAll(@Query('id') id?: string) {
    if (id) {
      const parsedId = idSchema.safeParse({ id });
      if (!parsedId.success) {
        throw new BadRequestException({
          message: 'ID do tópico inválido.',
          errors: this.handleZodError(parsedId.error),
        });
      }

      const topic = await this.topicsService.findOne(parsedId.data.id);
      if (!topic) {
        throw new NotFoundException('Topic not found');
      }
      return topic;
    }

    return this.topicsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createTopicDto: any) {
    const result = topicCreateSchema.safeParse(createTopicDto);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos para criação do tópico.',
        errors: this.handleZodError(result.error),
      });
    }

    return this.topicsService.create(result.data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTopicDto: any) {
    if (!id) {
      throw new BadRequestException(
        'ID do tópico é obrigatório para atualização.',
      );
    }

    const parsedId = idSchema.safeParse({ id });
    if (!parsedId.success) {
      throw new BadRequestException({
        message: 'ID do tópico inválido.',
        errors: this.handleZodError(parsedId.error),
      });
    }

    const result = topicUpdateSchema.safeParse(updateTopicDto);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos para atualização do tópico.',
        errors: this.handleZodError(result.error),
      });
    }

    try {
      return await this.topicsService.update(parsedId.data.id, result.data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Tópico não encontrado para atualização.');
      }
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException(
        'ID do tópico é obrigatório para exclusão.',
      );
    }

    const parsedId = idSchema.safeParse({ id });
    if (!parsedId.success) {
      throw new BadRequestException({
        message: 'ID do tópico inválido.',
        errors: this.handleZodError(parsedId.error),
      });
    }

    try {
      await this.topicsService.remove(parsedId.data.id);
      return { message: 'Tópico deletado com sucesso.' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Tópico não encontrado para exclusão.');
      }
      throw error;
    }
  }
}
