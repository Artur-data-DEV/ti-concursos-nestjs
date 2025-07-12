/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Server } from 'http';
import * as jwt from 'jsonwebtoken';
import { CreateAnswerAttemptDto } from '../src/answer-attempts/dto/create-answer-attempt.dto';
import { UpdateAnswerAttemptDto } from '../src/answer-attempts/dto/update-answer-attempt.dto';
import { Topic, UserRole } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

jest.setTimeout(30000);

describe('AnswerAttemptsController (e2e)', () => {
  let app: INestApplication;
  let server: Server;
  let prisma: PrismaService;

  let adminToken: string;
  let studentToken: string;

  let teacherId: string;
  let studentId: string;

  let questionId: string;
  let answerIdByStudent: string;
  let attemptId: string;

  function generateToken(user: { id: string; email: string; role: UserRole }) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' },
    );
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);

    // Limpa dados na ordem correta para não ter problema FK
    await prisma.answerAttempt.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.question.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.user.deleteMany();

    // Cria usuários
    const [admin, teacher, student] = await Promise.all([
      prisma.user.create({
        data: { email: 'admin@x.com', name: 'Admin', role: UserRole.ADMIN },
      }),
      prisma.user.create({
        data: {
          email: 'teacher@x.com',
          name: 'Teacher',
          role: UserRole.TEACHER,
        },
      }),
      prisma.user.create({
        data: {
          email: 'student@x.com',
          name: 'Student',
          role: UserRole.STUDENT,
        },
      }),
    ]);
    teacherId = teacher.id;
    studentId = student.id;

    adminToken = generateToken(admin);
    studentToken = generateToken(student);

    // Cria um tópico válido para a questão
    const validTopic: Topic = await prisma.topic.create({
      data: {
        id: createId(),
        name: `Tópico de Teste ${createId()}`,
      },
    });

    // Cria questão com todos campos obrigatórios preenchidos
    const question = await prisma.question.create({
      data: {
        questionType: 'MULTIPLA_ESCOLHA', // adapte se necessário
        difficulty: 'DIFICIL', // adapte se necessário
        topicId: validTopic.id,
        text: 'Descrição qualquer',
      },
    });
    questionId = question.id;

    // Para evitar erro, cria um course se necessário
    // Se question exige courseId obrigatório, crie assim:
    // const course = await prisma.course.create({ data: { name: 'Curso Teste' } });
    // questionId = (await prisma.question.create({ data: { ..., courseId: course.id } })).id;

    // Cria resposta do estudante para questão criada
    const answer = await prisma.answer.create({
      data: {
        userId: studentId,
        questionId,
        isCorrect: false,
        answeredAt: new Date(),
      },
    });
    answerIdByStudent = answer.id;

    // Cria tentativa inicial para testes PATCH/DELETE
    const attempt = await prisma.answerAttempt.create({
      data: {
        answerId: answerIdByStudent,
        isCorrect: false,
        timeSpent: 30,
        attemptAt: new Date(),
      },
    });
    attemptId = attempt.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // --- TESTES ---

  describe('GET /answer-attempts', () => {
    it('ADMIN pode listar todas as tentativas', async () => {
      const res = await request(server)
        .get('/answer-attempts')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('STUDENT pode listar suas próprias tentativas via userId', async () => {
      const res = await request(server)
        .get('/answer-attempts')
        .query({ userId: studentId })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      for (const attempt of res.body) {
        expect(attempt.answer.userId).toBe(studentId);
      }
    });

    it('STUDENT não pode listar tentativas de outro usuário', async () => {
      await request(server)
        .get('/answer-attempts')
        .query({ userId: createId() })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('POST /answer-attempts', () => {
    const validDto: CreateAnswerAttemptDto = {
      answerId: '', // sobrescrito no teste
      isCorrect: true,
      timeSpent: 45,
    };

    it('ADMIN pode criar tentativa para qualquer resposta', async () => {
      // Cria resposta para teacher
      const answerTeacher = await prisma.answer.create({
        data: {
          userId: teacherId,
          questionId,
          isCorrect: false,
          answeredAt: new Date(),
        },
      });

      const dto = { ...validDto, answerId: answerTeacher.id };

      const res = await request(server)
        .post('/answer-attempts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dto)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.answerId).toBe(dto.answerId);
    });

    it('STUDENT pode criar tentativa para sua própria resposta', async () => {
      const dto = { ...validDto, answerId: answerIdByStudent };

      const res = await request(server)
        .post('/answer-attempts')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(dto)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.answerId).toBe(dto.answerId);
    });

    it('STUDENT não pode criar tentativa para resposta de outro usuário', async () => {
      const answerTeacher = await prisma.answer.create({
        data: {
          userId: teacherId,
          questionId,
          isCorrect: false,
          answeredAt: new Date(),
        },
      });

      await request(server)
        .post('/answer-attempts')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ ...validDto, answerId: answerTeacher.id })
        .expect(403);
    });

    it('Deve retornar 404 se resposta não existir', async () => {
      await request(server)
        .post('/answer-attempts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validDto, answerId: createId() })
        .expect(404);
    });

    it('Deve retornar 400 para dados inválidos', async () => {
      await request(server)
        .post('/answer-attempts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          answerId: 'invalid-uuid',
          isCorrect: 'not-boolean',
          timeSpent: -10,
        })
        .expect(400);
    });
  });

  describe('PATCH /answer-attempts/:id', () => {
    it('ADMIN pode atualizar tentativa', async () => {
      const dto: UpdateAnswerAttemptDto = {
        id: attemptId,
        answerId: answerIdByStudent,
        isCorrect: true,
        timeSpent: 55,
      };

      const res = await request(server)
        .patch(`/answer-attempts/${attemptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dto)
        .expect(200);
      expect(res.body.id).toBe(attemptId);
      expect(res.body.isCorrect).toBe(true);
      expect(res.body.timeSpent).toBe(55);
    });

    it('STUDENT pode atualizar sua própria tentativa', async () => {
      const dto: UpdateAnswerAttemptDto = {
        id: attemptId,
        answerId: answerIdByStudent,
        isCorrect: false,
        timeSpent: 33,
      };

      const res = await request(server)
        .patch(`/answer-attempts/${attemptId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(dto)
        .expect(200);
      expect(res.body.id).toBe(attemptId);
      expect(res.body.timeSpent).toBe(33);
    });

    it('STUDENT não pode atualizar tentativa de outro usuário', async () => {
      const answerTeacher = await prisma.answer.create({
        data: {
          userId: teacherId,
          questionId,
          isCorrect: false,
          answeredAt: new Date(),
        },
      });
      const attemptTeacher = await prisma.answerAttempt.create({
        data: {
          answerId: answerTeacher.id,
          isCorrect: false,
          timeSpent: 20,
          attemptAt: new Date(),
        },
      });

      const dto: UpdateAnswerAttemptDto = {
        id: attemptTeacher.id,
        answerId: answerTeacher.id,
        isCorrect: true,
        timeSpent: 20,
      };

      await request(server)
        .patch(`/answer-attempts/${attemptTeacher.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(dto)
        .expect(403);
    });

    it('Deve retornar 400 se id da URL e do corpo não baterem', async () => {
      const dto: UpdateAnswerAttemptDto = {
        id: '00000000-0000-4000-8000-000000000000',
        answerId: answerIdByStudent,
        isCorrect: true,
        timeSpent: 20,
      };

      await request(server)
        .patch(`/answer-attempts/${attemptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dto)
        .expect(400);
    });

    it('Deve retornar 404 para tentativa não encontrada', async () => {
      const dto: UpdateAnswerAttemptDto = {
        id: createId(),
        answerId: answerIdByStudent,
        isCorrect: true,
        timeSpent: 20,
      };

      await request(server)
        .patch(`/answer-attempts/${dto.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dto)
        .expect(404);
    });

    it('Deve retornar 400 para id inválido (não UUID)', async () => {
      const dto: UpdateAnswerAttemptDto = {
        id: 'invalid-id',
        answerId: answerIdByStudent,
        isCorrect: true,
        timeSpent: 20,
      };

      await request(server)
        .patch('/answer-attempts/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(dto)
        .expect(400);
    });
  });

  describe('DELETE /answer-attempts/:id', () => {
    let deleteAttemptId: string;

    beforeAll(async () => {
      // Criar tentativa para teste de deleção
      const attempt = await prisma.answerAttempt.create({
        data: {
          answerId: answerIdByStudent,
          isCorrect: false,
          timeSpent: 15,
          attemptAt: new Date(),
        },
      });
      deleteAttemptId = attempt.id;
    });

    it('ADMIN pode deletar tentativa', async () => {
      await request(server)
        .delete(`/answer-attempts/${deleteAttemptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('STUDENT NÃO pode deletar sua própria tentativa', async () => {
      const attempt = await prisma.answerAttempt.create({
        data: {
          answerId: answerIdByStudent,
          isCorrect: true,
          timeSpent: 25,
          attemptAt: new Date(),
        },
      });

      await request(server)
        .delete(`/answer-attempts/${attempt.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('STUDENT não pode deletar tentativa de outro usuário', async () => {
      const answerTeacher = await prisma.answer.create({
        data: {
          userId: teacherId,
          questionId,
          isCorrect: false,
          answeredAt: new Date(),
        },
      });
      const attemptTeacher = await prisma.answerAttempt.create({
        data: {
          answerId: answerTeacher.id,
          isCorrect: false,
          timeSpent: 20,
          attemptAt: new Date(),
        },
      });

      await request(server)
        .delete(`/answer-attempts/${attemptTeacher.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('Deve retornar 404 para tentativa não encontrada', async () => {
      await request(server)
        .delete('/answer-attempts/' + createId())
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('Deve retornar 400 para id inválido', async () => {
      await request(server)
        .delete('/answer-attempts/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
