import crypto from 'node:crypto';
import { stmts } from '../../db/client.js';

const PROVIDERS = new Set(['telegram', 'google', 'yandex']);

export class UserError extends Error {
  constructor(code) { super(code); this.code = code; }
}

function normaliseProvider(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

function normaliseProviderUserId(raw) {
  return String(raw ?? '').trim();
}

function providerLabel(provider) {
  if (provider === 'telegram') return 'Telegram';
  if (provider === 'google') return 'Google';
  if (provider === 'yandex') return 'Yandex';
  return 'User';
}

function makeDisplayName(provider, providerUserId) {
  const suffix = crypto
    .createHash('sha1')
    .update(`${provider}:${providerUserId}`)
    .digest('hex')
    .slice(0, 6)
    .toUpperCase();
  return `${providerLabel(provider)} ${suffix}`;
}

export async function signInWithProvider({ provider, providerUserId }) {
  provider = normaliseProvider(provider);
  providerUserId = normaliseProviderUserId(providerUserId);

  if (!PROVIDERS.has(provider)) throw new UserError('invalid_provider');
  if (providerUserId.length < 16) throw new UserError('invalid_provider_user');

  const existing = stmts.getUserByProviderIdentity.get(provider, providerUserId);
  if (existing) {
    return {
      id: existing.id,
      provider: existing.provider,
      displayName: existing.display_name,
    };
  }

  const displayName = makeDisplayName(provider, providerUserId);
  const info = stmts.insertUser.run(provider, providerUserId, displayName, Date.now());
  return { id: info.lastInsertRowid, provider, displayName };
}

export function publicUser(u) {
  return {
    id: u.id,
    provider: u.provider,
    displayName: u.display_name ?? u.displayName,
  };
}
