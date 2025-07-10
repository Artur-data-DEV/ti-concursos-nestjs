import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { ModulesService } from './modules.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard/roles.guard';
import { Roles } from '../auth/roles.decorator/roles.decorator';
import { Module, UserRole } from '@prisma/client';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { AuthenticatedRequest } from 'src/common/interfaces/authenticated-request.interface';
import { ParseCuidPipe } from '../common/pipes/parse-cuid.pipe';

@Controller('modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Post()
  async create(
    @Body() createModuleDto: CreateModuleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Module> {
    const user = req.user;

    if (user.role === UserRole.STUDENT) {
      throw new ForbiddenException(
        'Students are not allowed to create modules.',
      );
    }

    try {
      return await this.modulesService.create(createModuleDto);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT, UserRole.TEACHER)
  @Get()
  async findAll(): Promise<Module[]> {
    return this.modulesService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STUDENT, UserRole.TEACHER)
  @Get(':id')
  async findOne(@Param('id', ParseCuidPipe) id: string): Promise<Module> {
    const module = await this.modulesService.findOne(id);

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    return module;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Patch(':id')
  async update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() updateModuleDto: UpdateModuleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Module> {
    const user = req.user;

    const existing = await this.modulesService.findOne(id);
    if (!existing) {
      throw new NotFoundException('Module not found');
    }

    if (user.role === UserRole.STUDENT) {
      throw new ForbiddenException('Students cannot update modules.');
    }

    try {
      return await this.modulesService.update(id, updateModuleDto);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseCuidPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const user = req.user;

    const existing = await this.modulesService.findOne(id);
    if (!existing) {
      throw new NotFoundException('Module not found');
    }

    if (user.role === UserRole.STUDENT) {
      throw new ForbiddenException('Students cannot delete modules.');
    }

    await this.modulesService.remove(id);
    return { message: 'Module deleted' };
  }
}
