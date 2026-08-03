import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('AuthController - Logout (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/logout - should return 200 and clear cookie', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('Successfully logged out.');
        const setCookie = res.get('Set-Cookie');
        expect(setCookie).toBeDefined();
      });
  });
});
