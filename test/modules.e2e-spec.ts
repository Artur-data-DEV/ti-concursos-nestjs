import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Server } from 'http';
import * as jwt from 'jsonwebtoken';
import { createId as cuid } from '@paralleldrive/cuid2';
import { Module, User, UserRole } from '@prisma/client';
import { CreateModuleDto } from '../src/modules/dto/create-module.dto';

jest.setTimeout(30000); // <-- aqui, no topo do arquivo, fora de beforeAll

describe('ModulesController (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  let prisma: PrismaService;
  let adminToken: string;
  let studentToken: string;
  let teacherToken: string;
  let moduleId: string;
  let validCourseId: string;

  function generateToken(user: User): string {
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
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);

    // Limpa os dados
    await prisma.module.deleteMany();
    await prisma.course.deleteMany();
    await prisma.user.deleteMany();

    // Cria usuários e tokens
    const [admin, student, teacher] = await Promise.all([
      prisma.user.create({
        data: { email: 'admin@x.com', name: 'Admin', role: UserRole.ADMIN },
      }),
      prisma.user.create({
        data: {
          email: 'student@x.com',
          name: 'Student',
          role: UserRole.STUDENT,
        },
      }),
      prisma.user.create({
        data: {
          email: 'teacher@x.com',
          name: 'Teacher',
          role: UserRole.TEACHER,
        },
      }),
    ]);

    adminToken = generateToken(admin);
    studentToken = generateToken(student);
    teacherToken = generateToken(teacher);

    // Cria curso
    const course = await prisma.course.create({
      data: {
        title: 'Curso Teste',
        description: 'Descricao',
        price: 50,
        instructorId: teacher.id,
      },
    });

    validCourseId = course.id;

    // Cria módulo base
    const baseModule = await prisma.module.create({
      data: {
        title: 'Módulo Base',
        description: 'Desc',
        order: 1,
        courseId: validCourseId,
      },
    });

    moduleId = baseModule.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /modules', () => {
    const validDto: CreateModuleDto = {
      title: 'Novo Módulo',
      description: 'Descrição',
      order: 2,
      courseId: '', // será sobrescrito
    };

    it('should return 400 when required fields are missing', async () => {
      await request(server)
        .post('/modules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('should return 409 when module order is duplicated', async () => {
      await request(server)
        .post('/modules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validDto, courseId: validCourseId, order: 1 })
        .expect(409);
    });

    it('should create a module (ADMIN)', async () => {
      const res = await request(server)
        .post('/modules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validDto, courseId: validCourseId })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('should create a module (TEACHER)', async () => {
      const res = await request(server)
        .post('/modules')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ ...validDto, courseId: validCourseId, order: 3 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('should forbid STUDENT from creating module', async () => {
      await request(server)
        .post('/modules')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ ...validDto, courseId: validCourseId, order: 4 })
        .expect(403);
    });

    it('should throw BadRequest for invalid data', async () => {
      await request(server)
        .post('/modules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '',
          description: '',
          order: -1,
          courseId: 'invalid-id',
        })
        .expect(400);
    });
  });

  describe('GET /modules', () => {
    it('should list modules (STUDENT)', async () => {
      const res = await request(server)
        .get('/modules')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const moduleUpdated = res.body as Module[];

      expect(moduleUpdated.length).toBeGreaterThan(0);
    });
  });

  describe('GET /modules/:id', () => {
    it('should return one module', async () => {
      await request(server)
        .get(`/modules/${moduleId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
    });

    it('should return 404 if not found', async () => {
      await request(server)
        .get(`/modules/${cuid()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 400 for invalid CUID', async () => {
      await request(server)
        .get('/modules/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PATCH /modules/:id', () => {
    it('should update module (ADMIN)', async () => {
      const res = await request(server)
        .patch(`/modules/${moduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated' })
        .expect(200);
      const moduleUpdated = res.body as Module;
      expect(moduleUpdated.title).toBe('Updated');
    });

    it('should return 400 on invalid data in update', async () => {
      await request(server)
        .patch(`/modules/${moduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ order: -99 })
        .expect(400);
    });

    it('should forbid STUDENT from updating', async () => {
      await request(server)
        .patch(`/modules/${moduleId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Forbidden' })
        .expect(403);
    });

    it('should return 404 if module not found', async () => {
      await request(server)
        .patch(`/modules/${cuid()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Not found' })
        .expect(404);
    });

    it('should return 400 for invalid CUID', async () => {
      await request(server)
        .patch('/modules/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Invalid' })
        .expect(400);
    });
  });

  describe('DELETE /modules/:id', () => {
    let tempModuleId: string;

    beforeAll(async () => {
      const temp = await prisma.module.create({
        data: {
          title: 'Temp',
          description: 'to delete',
          order: 999,
          courseId: validCourseId,
        },
      });
      tempModuleId = temp.id;
    });

    it('should delete module (ADMIN)', async () => {
      await request(server)
        .delete(`/modules/${tempModuleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should forbid STUDENT from deleting', async () => {
      await request(server)
        .delete(`/modules/${moduleId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should return 404 if module not found', async () => {
      await request(server)
        .delete(`/modules/${cuid()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 400 for invalid CUID', async () => {
      await request(server)
        .delete('/modules/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
