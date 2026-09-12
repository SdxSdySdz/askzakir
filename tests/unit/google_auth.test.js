import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';
import { config } from '../../server/config.js';

describe('Google OAuth routes', () => {
  let originalClientId;
  let originalClientSecret;

  beforeEach(() => {
    originalClientId = config.googleClientId;
    originalClientSecret = config.googleClientSecret;
    config.googleClientId = 'test-client-id';
    config.googleClientSecret = 'test-client-secret';
  });

  afterEach(() => {
    config.googleClientId = originalClientId;
    config.googleClientSecret = originalClientSecret;
    vi.restoreAllMocks();
  });

  it('GET /api/auth/google redirects to Google accounts and sets state cookie', async () => {
    const app = createApp();
    const res = await request(app).get('/api/auth/google');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(res.headers.location).toContain('client_id=test-client-id');
    expect(res.headers.location).toContain('response_type=code');
    expect(res.headers.location).toContain('scope=openid+email+profile');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.includes('az_oauth_state='))).toBe(true);
  });

  it('GET /api/auth/google/callback handles oauth flow and creates session', async () => {
    const app = createApp();
    const agent = request.agent(app);

    // 1. Trigger /api/auth/google (sets az_oauth_state cookie)
    const initRes = await agent.get('/api/auth/google');
    expect(initRes.status).toBe(302);

    const authUrl = new URL(initRes.headers.location);
    const state = authUrl.searchParams.get('state');
    expect(state).toBeTruthy();

    // 2. Mock global fetch for Google Token and UserInfo endpoints
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url === 'https://oauth2.googleapis.com/token') {
        return {
          ok: true,
          json: async () => ({
            access_token: 'fake-access-token',
            token_type: 'Bearer',
          }),
        };
      }
      if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
        return {
          ok: true,
          json: async () => ({
            sub: 'google-sub-1234567890123456',
            email: 'testuser@gmail.com',
            name: 'Test Google User',
            picture: 'https://example.com/avatar.jpg',
          }),
        };
      }
      return { ok: false, status: 404 };
    }));

    // 3. Request callback with matching code & state
    const callbackRes = await agent.get(`/api/auth/google/callback?code=mock-code&state=${state}`);
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toBe('/?auth_success=1');

    // 4. Verify user is now authenticated
    const meRes = await agent.get('/api/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.provider).toBe('google');
    expect(meRes.body.user.displayName).toBe('Test Google User');
  });

  it('GET /api/auth/google/callback rejects state mismatch', async () => {
    const app = createApp();
    const agent = request.agent(app);

    await agent.get('/api/auth/google');
    const res = await agent.get('/api/auth/google/callback?code=mock-code&state=wrong-state');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('auth_error=state_mismatch');
  });
});
