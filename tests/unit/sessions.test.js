import { describe, it, expect } from 'vitest';
import { createSession, getSession, destroySession } from '../../server/services/sessions.js';
import { signInWithProvider } from '../../server/services/users.js';

describe('sessions', () => {
  it('createSession возвращает hex-токен и его можно прочитать', async () => {
    const user = await signInWithProvider({
      provider: 'telegram',
      providerUserId: 'telegram-sess-user-000001',
    });
    const token = createSession(user.id);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    const row = getSession(token);
    expect(row.user_id).toBe(user.id);
  });

  it('getSession возвращает null для невалидного токена', () => {
    expect(getSession('nope')).toBeNull();
    expect(getSession('')).toBeNull();
    expect(getSession(null)).toBeNull();
  });

  it('destroySession удаляет токен', async () => {
    const user = await signInWithProvider({
      provider: 'google',
      providerUserId: 'google-kill-user-000001',
    });
    const token = createSession(user.id);
    destroySession(token);
    expect(getSession(token)).toBeNull();
  });
});
