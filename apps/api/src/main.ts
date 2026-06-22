import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security HTTP headers (CSP relaxed since this API only serves JSON).
  app.use(helmet({ contentSecurityPolicy: false }));

  app.enableCors({
    origin: ['http://localhost:8081', 'http://localhost:19006', 'ourplan://'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Ourplan API running on http://localhost:${port}/api/v1`);
}
bootstrap();
