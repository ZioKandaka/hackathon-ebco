import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');

  // Every response here is user-scoped (auth'd via cookie/JWT) and dynamic — never let the
  // browser's HTTP cache reuse one user's response for another user's request to the same URL
  // after an account switch in the same tab.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend server running on ${port}`);
}

bootstrap();
