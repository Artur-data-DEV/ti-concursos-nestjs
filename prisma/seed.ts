/* eslint-disable @typescript-eslint/no-misused-promises */
// prisma/seed.ts
import {
  PrismaClient,
  User,
  Topic,
  Subtopic,
  Technology,
  Tag,
  Banca,
  Course,
  UserRole,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function createUsers(): Promise<User[]> {
  console.log('👥 Criando usuários...');
  const roles: UserRole[] = ['ADMIN', 'TEACHER', 'STUDENT'];
  const users: User[] = [];
  const hashedPassword = await hash('password123', 10);

  for (let i = 0; i < 3; i++) {
    const role = roles[i];
    const user = await prisma.user.create({
      data: {
        name: `${role}_User_${i}`,
        email: `${role.toLowerCase()}${i}@ticoncursos.com`,
        role,
        secure: {
          create: { password: hashedPassword },
        },
      },
      include: { secure: true },
    });
    users.push(user);
  }

  console.log('✅ Usuários criados!');
  return users;
}

async function createTopicsAndSubtopics(): Promise<{
  topics: Topic[];
  subtopics: Subtopic[];
}> {
  console.log('📚 Criando tópicos e subtópicos...');
  const topicsData = [
    { name: 'Redes de Computadores', subtopics: ['TCP/IP', 'DNS'] },
    {
      name: 'Segurança da Informação',
      subtopics: ['Criptografia', 'Firewalls'],
    },
    { name: 'Banco de Dados', subtopics: ['SQL', 'Modelagem'] },
    { name: 'Programação', subtopics: ['Python', 'Java'] },
  ];

  const topics: Topic[] = [];
  const subtopics: Subtopic[] = [];

  for (const { name, subtopics: subNames } of topicsData) {
    const topic = await prisma.topic.create({ data: { name } });
    topics.push(topic);

    for (const sub of subNames) {
      const subtopic = await prisma.subtopic.create({
        data: { name: sub, topicId: topic.id },
      });
      subtopics.push(subtopic);
    }
  }

  console.log('✅ Tópicos e subtópicos criados!');
  return { topics, subtopics };
}

async function createBancas(): Promise<Banca[]> {
  console.log('🏛️ Criando bancas...');
  const bancas = [
    {
      name: 'CESPE/CEBRASPE',
      fullName:
        'Centro Brasileiro de Pesquisa em Avaliação e Seleção e de Promoção de Eventos',
    },
    { name: 'FCC', fullName: 'Fundação Carlos Chagas' },
    { name: 'FGV', fullName: 'Fundação Getúlio Vargas' },
  ];

  const result = await Promise.all(
    bancas.map((b) =>
      prisma.banca.upsert({ where: { name: b.name }, update: {}, create: b }),
    ),
  );

  console.log('✅ Bancas criadas!');
  return result;
}

async function createTechnologies(): Promise<Technology[]> {
  console.log('🧪 Criando tecnologias...');
  const techs = ['Python', 'Java', 'SQL', 'Linux'];
  const result = await Promise.all(
    techs.map((name) =>
      prisma.technology.upsert({
        where: { name },
        update: {},
        create: { name, category: 'Programming Language' },
      }),
    ),
  );
  console.log('✅ Tecnologias criadas!');
  return result;
}

async function createTags(): Promise<Tag[]> {
  console.log('🏷️ Criando tags...');
  const tags = ['Redes', 'Criptografia', 'Programação', 'Banco de Dados'];
  const result = await Promise.all(
    tags.map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
  console.log('✅ Tags criadas!');
  return result;
}

async function createQuestions(
  topics: Topic[],
  subtopics: Subtopic[],
  bancas: Banca[],
  technologies: Technology[],
  tags: Tag[],
): Promise<void> {
  console.log('❓ Criando questões...');
  const topicMap = Object.fromEntries(topics.map((t) => [t.name, t]));
  const subMap = Object.fromEntries(subtopics.map((s) => [s.name, s]));
  const bancaMap = Object.fromEntries(bancas.map((b) => [b.name, b]));
  const techMap = Object.fromEntries(technologies.map((t) => [t.name, t]));
  const tagMap = Object.fromEntries(tags.map((t) => [t.name, t]));

  await prisma.question.create({
    data: {
      text: 'No modelo OSI, qual camada é responsável pelo roteamento de pacotes?',
      difficulty: 'MEDIO',
      topicId: topicMap['Redes de Computadores'].id,
      subtopicId: subMap['TCP/IP'].id,
      bancaId: bancaMap['CESPE/CEBRASPE'].id,
      questionType: 'MULTIPLA_ESCOLHA',
      technologies: {
        create: [{ technologyId: techMap['Python'].id }],
      },
      options: {
        create: [
          { text: 'Camada de Aplicação', isCorrect: false, order: 1 },
          { text: 'Camada de Transporte', isCorrect: false, order: 2 },
          { text: 'Camada de Rede', isCorrect: true, order: 3 },
          { text: 'Camada de Enlace', isCorrect: false, order: 4 },
        ],
      },
      tags: {
        create: [{ tagId: tagMap['Redes'].id }],
      },
    },
  });

  console.log('✅ Questões criadas!');
}

async function createCourses(teachers: User[]): Promise<Course[]> {
  console.log('📘 Criando cursos...');
  const courses: Course[] = [];

  for (let i = 0; i < 3; i++) {
    const course = await prisma.course.create({
      data: {
        title: `Curso Exemplo ${i + 1}`,
        description: `Descrição do curso exemplo ${i + 1}`,
        instructorId: teachers[i % teachers.length].id,
        isPublished: true,
        modules: {
          create: [
            {
              title: `Módulo ${i + 1}`,
              description: 'Introdução ao conteúdo ' + (i + 1),
              order: i + 1,
              lessons: {
                create: [
                  {
                    title: 'Aula 1',
                    content: 'Conteúdo da aula 1',
                    lessonType: 'TEXT',
                    order: i + 1,
                  },
                ],
              },
            },
          ],
        },
      },
    });
    courses.push(course);
  }

  console.log('✅ Cursos criados!');
  return courses;
}

async function purgeDatabase() {
  console.log('🧹 Limpando banco de dados...');
  await prisma.answerAttempt.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.favoriteQuestion.deleteMany();
  await prisma.userTopicPerformance.deleteMany();
  await prisma.courseReview.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.technology.deleteMany();
  await prisma.banca.deleteMany();
  await prisma.subtopic.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.userSecure.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Banco limpo com sucesso!');
}

async function seed() {
  await purgeDatabase();

  const users = await createUsers();
  const teachers = users.filter((u) => u.role === 'TEACHER');

  const { topics, subtopics } = await createTopicsAndSubtopics();
  const bancas = await createBancas();
  const technologies = await createTechnologies();
  const tags = await createTags();
  await createQuestions(topics, subtopics, bancas, technologies, tags);
  await createCourses(teachers);

  console.log('🎉 Seed executada com sucesso!');
}

seed()
  .catch((e) => {
    console.error('❌ Erro durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
