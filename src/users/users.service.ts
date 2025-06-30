import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const { password, ...userData } = data;
    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        ...userData,
        secure: {
          create: { password: hashedPassword },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany();
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findOneByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { secure: true },
    });
  }

  async update(id: string, data: any) {
    const { password, ...userData } = data;
    let updateData: Prisma.UserUpdateInput = userData;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData = {
        ...userData,
        secure: {
          update: { password: hashedPassword },
        },
      };
    }

    return this.prisma.user.update({ where: { id }, data: updateData });
  }

  async remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
