import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.topic.findMany({
      include: {
        subtopics: true,
        questions: true,
        topicPerformance: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.topic.findUnique({
      where: { id },
      include: {
        subtopics: true,
        questions: true,
        topicPerformance: true,
      },
    });
  }

  async create(data: any) {
    return this.prisma.topic.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.topic.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.topic.delete({ where: { id } });
  }
}

