import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  async findAll({
    name,
    limit,
    offset,
  }: {
    name: string | undefined;
    limit: string | undefined;
    offset: string | undefined;
  }) {
    return this.prisma.topic.findMany({
      where: { name: { contains: name } },
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
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

  async create(data: CreateTopicDto) {
    return this.prisma.topic.create({
      data,
    });
  }

  async update(id: string, data: UpdateTopicDto) {
    return this.prisma.topic.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.topic.delete({ where: { id } });
  }
}
