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
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import { Roles } from '../auth/roles.decorator/roles.decorator';
import { UserRole } from '@prisma/client';
import { z, ZodError } from 'zod';

// Schemas de validação
const userCreateSchema = z.object({
  name: z.string().min(1, 'O nome do usuário é obrigatório.'),
  email: z.string().email('Formato de e-mail inválido.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  role: z.enum(['STUDENT', 'PROFESSOR', 'ADMIN'], {
    message: 'Função de usuário inválida.',
  }),
});

const userUpdateSchema = z.object({
  name: z.string().min(1, 'O nome do usuário é obrigatório.').optional(),
  email: z.string().email('Formato de e-mail inválido.').optional(),
  password: z
    .string()
    .min(6, 'A senha deve ter no mínimo 6 caracteres.')
    .optional(),
  role: z
    .enum(['STUDENT', 'PROFESSOR', 'ADMIN'], {
      message: 'Função de usuário inválida.',
    })
    .optional(),
});

const idSchema = z.object({
  id: z.string().uuid('O ID deve ser um UUID válido.'),
});

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private handleZodError(error: ZodError) {
    return error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req: any, @Query('id') id?: string) {
    const token = req.user;

    if (!token) {
      throw new ForbiddenException('Não autenticado.');
    }

    if (id) {
      const parsedId = idSchema.safeParse({ id });
      if (!parsedId.success) {
        throw new BadRequestException({
          message: 'ID do usuário inválido.',
          errors: this.handleZodError(parsedId.error),
        });
      }

      // Usuário só pode ver o próprio perfil, a menos que seja ADMIN
      if (token.role !== 'ADMIN' && token.sub !== parsedId.data.id) {
        throw new ForbiddenException('Não autorizado.');
      }

      const user = await this.usersService.findOne(parsedId.data.id);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    }

    // Apenas ADMIN pode listar todos os usuários
    if (token.role !== 'ADMIN') {
      throw new ForbiddenException('Não autorizado.');
    }

    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() createUserDto: any) {
    const result = userCreateSchema.safeParse(createUserDto);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos para criação do usuário.',
        errors: this.handleZodError(result.error),
      });
    }

    return this.usersService.create(result.data);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: any,
    @Request() req: any,
  ) {
    const token = req.user;

    if (!token) {
      throw new ForbiddenException('Não autenticado.');
    }

    const parsedId = idSchema.safeParse({ id });
    if (!parsedId.success) {
      throw new BadRequestException({
        message: 'ID do usuário inválido.',
        errors: this.handleZodError(parsedId.error),
      });
    }

    // Usuário só pode atualizar o próprio perfil, a menos que seja ADMIN
    if (token.role !== 'ADMIN' && token.sub !== parsedId.data.id) {
      throw new ForbiddenException('Não autorizado.');
    }

    const result = userUpdateSchema.safeParse(updateUserDto);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados inválidos para atualização do usuário.',
        errors: this.handleZodError(result.error),
      });
    }

    try {
      return await this.usersService.update(parsedId.data.id, result.data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Usuário não encontrado para atualização.');
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
        message: 'ID do usuário inválido.',
        errors: this.handleZodError(parsedId.error),
      });
    }

    // Apenas ADMIN pode deletar usuários, ou o próprio usuário pode deletar sua conta
    if (token.role !== 'ADMIN' && token.sub !== parsedId.data.id) {
      throw new ForbiddenException('Não autorizado.');
    }

    try {
      await this.usersService.remove(parsedId.data.id);
      return { message: 'Usuário deletado com sucesso.' };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Usuário não encontrado para exclusão.');
      }
      throw error;
    }
  }
}
