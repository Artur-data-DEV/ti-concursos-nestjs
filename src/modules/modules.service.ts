import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateModuleDto } from './dto/create-module.dto';

@Injectable()
export class ModulesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateModuleDto) {
    const data: Prisma.ModuleCreateInput = {
      title: dto.title,
      order: dto.order,
      description: dto.description,
      course: {
        connect: { id: dto.courseId },
      },
    };

    return this.prisma.module.create({ data });
  }

  async findAll() {
    return this.prisma.module.findMany();
  }

  async findOne(id: string) {
    const module = await this.prisma.module.findUnique({ where: { id } });
    if (!module) throw new NotFoundException('Module not found');
    return module;
  }

  async isTeacherOwnerOfModule(
    teacherId: string,
    moduleId: string,
  ): Promise<boolean> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        course: {
          select: {
            instructor: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!module?.course?.instructor) return false;

    return module.course.instructor.id === teacherId;
  }

  async update(id: string, data: Prisma.ModuleUpdateInput) {
    // Verifica se módulo existe antes de atualizar
    await this.findOne(id);
    return this.prisma.module.update({ where: { id }, data });
  }

  async remove(id: string) {
    // Verifica se módulo existe antes de deletar
    await this.findOne(id);
    return this.prisma.module.delete({ where: { id } });
  }
}
