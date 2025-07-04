import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ModulesService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ModuleCreateInput) {
    return this.prisma.module.create({ data });
  }

  async findAll() {
    return this.prisma.module.findMany();
  }

  async findOne(id: string) {
    return this.prisma.module.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.ModuleUpdateInput) {
    return this.prisma.module.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.module.delete({ where: { id } });
  }
}
