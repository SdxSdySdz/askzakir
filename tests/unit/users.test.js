import { describe, it, expect } from 'vitest';
import { signInWithProvider, UserError } from '../../server/services/users.js';

describe('signInWithProvider', () => {
  it('создаёт пользователя для поддерживаемого провайдера', async () => {
    const user = await signInWithProvider({
      provider: 'telegram',
      providerUserId: 'telegram-user-000001',
    });
    expect(user.id).toBeGreaterThan(0);
    expect(user.provider).toBe('telegram');
    expect(user.displayName).toMatch(/^Telegram /);
  });

  it('возвращает того же пользователя при повторном входе', async () => {
    const first = await signInWithProvider({
      provider: 'google',
      providerUserId: 'google-user-000001',
    });
    const second = await signInWithProvider({
      provider: 'google',
      providerUserId: 'google-user-000001',
    });
    expect(second.id).toBe(first.id);
    expect(second.displayName).toBe(first.displayName);
  });

  it('нормализует provider к нижнему регистру', async () => {
    const user = await signInWithProvider({
      provider: 'YANDEX',
      providerUserId: 'yandex-user-000001',
    });
    expect(user.provider).toBe('yandex');
  });

  it('отказывает на неизвестном провайдере', async () => {
    await expect(signInWithProvider({
      provider: 'vk',
      providerUserId: 'vk-user-000001',
    })).rejects.toMatchObject({ code: 'invalid_provider' });
  });

  it('отказывает на слишком коротком provider user id', async () => {
    await expect(signInWithProvider({
      provider: 'telegram',
      providerUserId: 'short',
    })).rejects.toBeInstanceOf(UserError);
  });
});
