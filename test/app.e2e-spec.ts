import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Không kết nối database thật: thay DataSource bằng bản giả đủ để tạo repository.
      .overrideProvider(DataSource)
      .useValue({
        query: vi.fn().mockResolvedValue([1]),
        options: { type: 'postgres' },
        entityMetadatas: [],
        getRepository: () => ({}),
        manager: {},
        isInitialized: false,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
