import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any, authorId: string) {
    return this.prisma.question.create({
      data: {
        text: data.text,
        difficulty: data.difficulty,
        questionType: data.questionType,
        topicId: data.topicId,
        subtopicId: data.subtopicId,
        bancaId: data.bancaId,
        authorId: authorId, // Define o autor da questão como o usuário logado
        technologies: data.technologies
          ? {
              create: data.technologies.map((id: any) => ({
                technology: { connect: { id } },
              })),
            }
          : undefined,
        options: data.options
          ? {
              create: data.options,
            }
          : undefined,
        tags: data.tags
          ? {
              create: data.tags.map((name: any) => ({
                tag: {
                  connectOrCreate: {
                    where: { name },
                    create: { name },
                  },
                },
              })),
            }
          : undefined,
      },
    });
  }

  async findAll(filters: any) {
    return this.prisma.question.findMany({
      where: {
        ...(filters.topicId && { topicId: filters.topicId }),
        ...(filters.subtopicId && { subtopicId: filters.subtopicId }),
        ...(filters.bancaId && { bancaId: filters.bancaId }),
        ...(filters.technologyId && {
          technologies: { some: { technologyId: filters.technologyId } },
        }),
        ...(filters.tagId && {
          tags: { some: { tagId: filters.tagId } },
        }),
      },
      include: {
        topic: true,
        subtopic: true,
        banca: true,
        technologies: { include: { technology: true } },
        options: true,
        tags: { include: { tag: true } },
      },
      take: filters.limit ? parseInt(filters.limit) : undefined,
      skip: filters.offset ? parseInt(filters.offset) : undefined,
    });
  }

  async findOne(id: string, includeRelations = false) {
    if (includeRelations) {
      return this.prisma.question.findUnique({
        where: { id },
        include: {
          topic: true,
          subtopic: true,
          banca: true,
          technologies: { include: { technology: true } },
          options: true,
          tags: { include: { tag: true } },
        },
      });
    }

    return this.prisma.question.findUnique({
      where: { id },
      select: { authorId: true, id: true },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.question.update({
      where: { id },
      data: {
        text: data.text,
        difficulty: data.difficulty,
        questionType: data.questionType,
        topicId: data.topicId,
        subtopicId: data.subtopicId,
        bancaId: data.bancaId,
        technologies: data.technologies
          ? {
              deleteMany: {},
              create: data.technologies.map((id: any) => ({
                technology: { connect: { id } },
              })),
            }
          : undefined,
        options: data.options
          ? {
              deleteMany: {},
              create: data.options,
            }
          : undefined,
        tags: data.tags
          ? {
              deleteMany: {},
              create: data.tags.map((name: any) => ({
                tag: {
                  connectOrCreate: {
                    where: { name },
                    create: { name },
                  },
                },
              })),
            }
          : undefined,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.question.delete({ where: { id } });
  }
}
