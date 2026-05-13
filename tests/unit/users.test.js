import { describe, it, expect } from 'vitest';
import { registerUser, authenticateUser, UserError } from '../../server/services/users.js';

describe('registerUser', () => {
  it('создаёт пользователя с корректным логином и паролем', async () => {
    const user = await registerUser({ login: 'alice', password: 'longpassword' });
    expect(user.id).toBeGreaterThan(0);
    expect(user.login).toBe('alice');
  });

  it('нормализует логин к нижнему регистру и trim-у', async () => {
    const user = await registerUser({ login: '  Bob  ', password: 'longpassword' });
    expect(user.login).toBe('bob');
  });

  it('отказывает на коротком пароле', async () => {
    await expect(registerUser({ login: 'short', password: '1234567' }))
      .rejects.toBeInstanceOf(UserError);
  });

  it('отказывает на невалидном логине', async () => {
    await expect(registerUser({ login: 'a b', password: 'longpassword' }))
      .rejects.toMatchObject({ code: 'invalid_login' });
  });

  it('отказывает на повторе логина', async () => {
    await registerUser({ login: 'taken', password: 'longpassword' });
    await expect(registerUser({ login: 'taken', password: 'otherpassword' }))
      .rejects.toMatchObject({ code: 'login_taken' });
  });
});

describe('authenticateUser', () => {
  it('логинит существующего пользователя', async () => {
    await registerUser({ login: 'charlie', password: 'longpassword' });
    const user = await authenticateUser({ login: 'charlie', password: 'longpassword' });
    expect(user.login).toBe('charlie');
  });

  it('отказывает с неверным паролем', async () => {
    await registerUser({ login: 'dave', password: 'longpassword' });
    await expect(authenticateUser({ login: 'dave', password: 'wrongpassword' }))
      .rejects.toMatchObject({ code: 'invalid_credentials' });
  });

  it('возвращает одну и ту же ошибку для несуществующего юзера (защита от user-enumeration)', async () => {
    await expect(authenticateUser({ login: 'ghost', password: 'anything-here' }))
      .rejects.toMatchObject({ code: 'invalid_credentials' });
  });
});
