import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('LocationsController (e2e)', () => {
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

  it('GET /api/v1/locations - should return 401 for unauthenticated request', () => {
    return request(app.getHttpServer())
      .get('/api/v1/locations')
      .expect(401);
  });

  it('POST /api/v1/locations - should return 401 for unauthenticated request', () => {
    return request(app.getHttpServer())
      .post('/api/v1/locations')
      .send({
        name: 'Test Branch',
        businessType: 'retail',
        fullAddress: 'Jl. Sudirman No. 10',
        latitude: -6.2088,
        longitude: 106.8456,
      })
      .expect(401);
  });
});
