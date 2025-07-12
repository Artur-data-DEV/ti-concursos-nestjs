import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Course, Module, UserRole } from '@prisma/client';
import { CreateModuleDto } from '../src/modules/dto/create-module.dto';
import { Server } from 'http';
import { getTokenForUser } from '../src/__mocks__/utils/auth.helper';
import { createId as cuid } from '@paralleldrive/cuid2';
import { randomUUID } from 'crypto';

describe('ModulesController (e2e)', () => {
  let app: INestApplication;
  let server: Server;

  let prisma: PrismaService;
  let adminToken: string;
  let studentToken: string;
  let teacherToken: string;
  let moduleId: string;
  let validCourseId: string;

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

    // Limpa dados anteriores
    await prisma.module.deleteMany();
    await prisma.course.deleteMany();
    await prisma.user.deleteMany();

    // Gera tokens
    const { token: adminTokenObj } = await getTokenForUser(
      prisma,
      UserRole.ADMIN,
    );
    const { token: studentTokenObj } = await getTokenForUser(
      prisma,
      UserRole.STUDENT,
    );
    const { token: teacherTokenObj } = await getTokenForUser(
      prisma,
      UserRole.TEACHER,
    );

    adminToken = adminTokenObj;
    studentToken = studentTokenObj;
    teacherToken = teacherTokenObj;

    // Cria instrutor real
    const instructor = await prisma.user.upsert({
      where: { email: 'teacher@example.com' },
      update: {},
      create: {
        email: 'teacher@example.com',
        name: 'Instructor',
        role: UserRole.TEACHER,
      },
    });

    // Cria curso real
    const course: Course = await prisma.course.create({
      data: {
        title: 'Test Course',
        description: 'Course Desc',
        price: 100,
        instructorId: instructor.id,
      },
    });

    validCourseId = course.id;
    expect(validCourseId).toBeDefined();

    // Cria módulo base com order = 1 para teste de duplicidade
    const baseModule = await prisma.module.create({
      data: {
        title: 'Base Module',
        description: 'Base Module Description',
        order: 1,
        courseId: validCourseId,
      },
    });
    moduleId = baseModule.id;
    expect(moduleId).toBeDefined();
  });

  afterAll(async () => {
    await prisma.module.deleteMany();
    await prisma.course.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /modules', () => {
    const validDto: CreateModuleDto = {
      title: 'New Module',
      description: 'Module Description',
      order: 2, // order diferente do base (1)
      courseId: '', // será sobrescrito no teste
    };

    it('should return 400 when required fields are missing', async () => {
      await request(server)
        .post('/modules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}) // campos ausentes
        .expect(400);
    });

    it('should return 409 when module order is duplicated', async () => {
      await request(server)
        .post('/modules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validDto, courseId: validCourseId, order: 1 }) // order duplicado com baseModule
        .expect(409);
    });

    it('should create a module (ADMIN)', async () => {
      const res = await request(server)
        .post('/modules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validDto, courseId: validCourseId })
        .expect(201);

      const createdModule = res.body as Module;
      expect(createdModule).toHaveProperty('id');
      expect(createdModule.order).toBe(validDto.order);
    });

    it('should create a module (TEACHER)', async () => {
      const res = await request(server)
        .post('/modules')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          ...validDto,
          courseId: validCourseId,
          order: 3, // ordem diferente
          title: 'Teacher Module',
        })
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
      await request(server)
        .post('/modules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: '',
          description: '',
          order: -1,
          courseId: randomUUID(), // ID inválido - formato UUID incompatível com banco (CUIDv2)
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

      const modules = res.body as Module[];
      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
      expect(modules[0]).toHaveProperty('id');
      expect(modules[0]).toHaveProperty('title');
    });
  });

  describe('GET /modules/:id', () => {
    it('should return one module', async () => {
      expect(moduleId).toBeDefined();

      const res = await request(server)
        .get(`/modules/${moduleId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', moduleId);
    });

    it('should return 404 if not found', async () => {
      await request(server)
        .get(`/modules/${cuid()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 400 for invalid CUID', async () => {
      await request(server)
        .get('/modules/invalid-cuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('PATCH /modules/:id', () => {
    it('should update module (ADMIN)', async () => {
      expect(moduleId).toBeDefined();

      const res = await request(server)
        .patch(`/modules/${moduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      const body = res.body as Module;
      expect(body.title).toBe('Updated Title');
    });

    it('should return 400 on invalid data in update', async () => {
      await request(server)
        .patch(`/modules/${moduleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ order: -100 }) // inválido
        .expect(400);
    });

    it('should forbid STUDENT from updating', async () => {
      await request(server)
        .patch(`/modules/${moduleId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Student Edit' })
        .expect(403);
    });

    it('should return 404 if module not found', async () => {
      await request(server)
        .patch(`/modules/${cuid()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Not Found' })
        .expect(404);
    });

    it('should return 400 for invalid CUID', async () => {
      await request(server)
        .patch('/modules/invalid-cuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Invalid CUID' })
        .expect(400);
    });
  });

  describe('DELETE /modules/:id', () => {
    let tempModuleId: string;

    beforeAll(async () => {
      const mod = await prisma.module.create({
        data: {
          title: 'Temp Module',
          description: 'To be deleted',
          order: 100,
          courseId: validCourseId,
        },
      });
      tempModuleId = mod.id;
      expect(tempModuleId).toBeDefined();
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

    it('should return 404 if not found', async () => {
      await request(server)
        .delete(`/modules/${cuid()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 400 for invalid CUID', async () => {
      await request(server)
        .delete(`/modules/invalid-id`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
