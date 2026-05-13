import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';

const app = createApp();
const CSRF = { 'X-Requested-With': 'fetch' };

describe('CSRF guard', () => {
  it('блокирует POST без X-Requested-With', async () => {
    const res = await request(app).post('/api/auth/register').send({ login: 'a', password: 'b' });
    expect(res.status).toBe(403);
  });
  it('пропускает GET без заголовка', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });
});

describe('auth flow', () => {
  it('register → me → logout → me=401', async () => {
    const agent = request.agent(app);
    let r = await agent.post('/api/auth/register').set(CSRF).send({ login: 'apitest', password: 'longpassword' });
    expect(r.status).toBe(200);
    expect(r.body.user.login).toBe('apitest');

    r = await agent.get('/api/me');
    expect(r.status).toBe(200);
    expect(r.body.user.login).toBe('apitest');

    r = await agent.post('/api/auth/logout').set(CSRF);
    expect(r.status).toBe(204);

    r = await agent.get('/api/me');
    expect(r.status).toBe(401);
  });

  it('login проваливается на неверном пароле', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').set(CSRF).send({ login: 'logintest', password: 'longpassword' });
    const r = await agent.post('/api/auth/login').set(CSRF).send({ login: 'logintest', password: 'wrong' });
    expect(r.status).toBe(401);
    expect(r.body.error).toBe('invalid_credentials');
  });

  it('одинаковый ответ для несуществующего юзера и неверного пароля', async () => {
    const agent = request.agent(app);
    const r = await agent.post('/api/auth/login').set(CSRF).send({ login: 'ghost', password: 'whatever' });
    expect(r.status).toBe(401);
    expect(r.body.error).toBe('invalid_credentials');
  });
});

describe('chats', () => {
  it('требует auth', async () => {
    const r = await request(app).get('/api/chats');
    expect(r.status).toBe(401);
  });

  it('lazy chat creation в одной транзакции', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').set(CSRF).send({ login: 'chatuser', password: 'longpassword' });

    let r = await agent.get('/api/chats');
    expect(r.body.chats).toEqual([]);

    r = await agent.post('/api/chats/new/messages').set(CSRF).send({ content: 'смоук-сообщение' });
    expect(r.status).toBe(200);
    expect(r.body.chatId).toBeGreaterThan(0);
    expect(r.body.userMessage.role).toBe('user');
    expect(r.body.aiMessage.role).toBe('assistant');

    r = await agent.get('/api/chats');
    expect(r.body.chats.length).toBe(1);
    expect(r.body.chats[0].title).toBe('смоук-сообщение');
  });

  it('кросс-юзерный доступ к чужому чату → 404', async () => {
    const userA = request.agent(app);
    const userB = request.agent(app);
    await userA.post('/api/auth/register').set(CSRF).send({ login: 'usera', password: 'longpassword' });
    const r1 = await userA.post('/api/chats/new/messages').set(CSRF).send({ content: 'a-secret' });
    const aChatId = r1.body.chatId;
    await userB.post('/api/auth/register').set(CSRF).send({ login: 'userb', password: 'longpassword' });
    const r2 = await userB.get(`/api/chats/${aChatId}`);
    expect(r2.status).toBe(404);
  });
});
