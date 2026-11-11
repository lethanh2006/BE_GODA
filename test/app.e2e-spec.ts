import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './../src/app.module.js';
import { DecksService } from '../src/modules/decks/decks.service.js';
import { DungMoriCatalog } from '../src/modules/decks/dung-mori-catalog.js';

describe('App (e2e)', () => {
  let app: INestApplication<App>;
  const ensureForUser = vi.fn();
  const list = vi.fn().mockResolvedValue({ decks: [], due: 0 });
  const queue = vi.fn().mockResolvedValue({ cards: [], total: 0 });
  const userId = '6bcfb80f-87d2-4aef-b5eb-144703fd0920';

  beforeEach(async () => {
    vi.clearAllMocks();
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
      .overrideProvider(DungMoriCatalog)
      .useValue({ ensureForUser })
      .overrideProvider(DecksService)
      .useValue({ list, queue })
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

  it.each([
    ['get', '/api/decks?collection=dung-mori-n4'],
    ['get', '/api/decks/queue?collection=dung-mori-n4'],
    ['get', `/api/decks/${userId}`],
    ['post', `/api/decks/${userId}/learned`],
    ['post', `/api/decks/${userId}/practice`],
    ['post', '/api/decks/review'],
  ] as const)('blocks guests: %s %s', async (method, path) => {
    await request(app.getHttpServer())[method](path).expect(401);
    expect(ensureForUser).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
    expect(queue).not.toHaveBeenCalled();
  });

  it('makes N4 Dũng Mori available to an ordinary logged-in user', async () => {
    const token = app.get(JwtService).sign({ sub: userId, role: 'USER' });
    await request(app.getHttpServer())
      .get('/api/decks?collection=dung-mori-n4')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(ensureForUser).toHaveBeenCalledWith(userId);
    expect(list).toHaveBeenCalledWith(userId, 'dung-mori-n4');
    await request(app.getHttpServer())
      .get('/api/decks/queue?collection=dung-mori-n4')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(queue).toHaveBeenCalledWith(userId, 20, 'dung-mori-n4');
  });

  it('keeps the default private collection and rejects unknown collections', async () => {
    const token = app.get(JwtService).sign({ sub: userId, role: 'USER' });
    await request(app.getHttpServer())
      .get('/api/decks')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(list).toHaveBeenCalledWith(userId, 'private');
    await request(app.getHttpServer())
      .get('/api/decks?collection=other')
      .auth(token, { type: 'bearer' })
      .expect(400);
    expect(ensureForUser).not.toHaveBeenCalled();
  });

  afterEach(async () => {
    await app.close();
  });
});
