import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove propriedades não listadas no DTO
      forbidNonWhitelisted: true, // lança erro se propriedades extras forem enviadas
      transform: true, // transforma payloads para os tipos corretos
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
