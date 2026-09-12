import { appState, GREETING_TEXT, readPending, writePending, clearPending } from './state.js';
import { api, AUTH_ERROR_MAP } from './api.js';
import { fillQuestionInput } from './chat.js';
import { loadChats, renderDrawerFooter } from './drawer.js';
import { primeVideoAudio, stopVideo } from './video.js';
import { setBilling } from './billing.js';

const AUTH_PROVIDER_KEY = 'askzakir:provider-identities';
const authModal = document.getElementById('auth-modal');
const authBackdrop = document.getElementById('auth-backdrop');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authGreeting = document.getElementById('auth-greeting');
const authError = document.getElementById('auth-error');
const authCloseBtn = document.getElementById('auth-close');
const providerButtons = Array.from(document.querySelectorAll('.auth-provider'));

function providerLabel(provider) {
  if (provider === 'telegram') return 'Телеграм';
  if (provider === 'google') return 'Гугл почта';
  if (provider === 'yandex') return 'Яндекс почта';
  return 'Провайдер';
}

function readProviderMap() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_PROVIDER_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeProviderMap(map) {
  try {
    localStorage.setItem(AUTH_PROVIDER_KEY, JSON.stringify(map));
  } catch {}
}

function ensureProviderIdentity(provider) {
  const map = readProviderMap();
  if (!map[provider]) {
    map[provider] = crypto.randomUUID().replace(/-/g, '');
    writeProviderMap(map);
  }
  return map[provider];
}

function setBusy(state) {
  for (const button of providerButtons) button.disabled = state;
}

export function openAuthModal(greetingText) {
  authTitle.textContent = 'Выберите способ входа';
  authError.textContent = '';
  if (greetingText) {
    authGreeting.textContent = greetingText;
    authGreeting.hidden = false;
  } else {
    authGreeting.hidden = true;
  }
  authBackdrop.classList.add('open');
  authModal.classList.add('open');
}

export function closeAuthModal() {
  authModal.classList.remove('open');
  authBackdrop.classList.remove('open');
}

async function signIn(provider) {
  authError.textContent = '';
  setBusy(true);
  try {
    const providerUserId = ensureProviderIdentity(provider);
    const { user, billing } = await api('POST', '/api/auth/provider', { provider, providerUserId });
    appState.user = user;
    setBilling(billing);
    closeAuthModal();
    await loadChats();
    renderDrawerFooter();
    const pending = readPending();
    if (pending) {
      clearPending();
      appState.currentChatId = 'new';
      document.dispatchEvent(new CustomEvent('auth:success', { detail: { pending } }));
      fillQuestionInput(pending);
    } else {
      document.dispatchEvent(new CustomEvent('auth:success'));
    }
  } catch (err) {
    stopVideo();
    const providerName = providerLabel(provider);
    authError.textContent =
      AUTH_ERROR_MAP[err.code] || `Не удалось войти через ${providerName}. Попробуйте ещё раз.`;
  } finally {
    setBusy(false);
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const provider = e.submitter?.dataset?.provider;
  if (!provider) return;
  primeVideoAudio();
  await signIn(provider);
}

export function initAuth() {
  authCloseBtn.addEventListener('click', closeAuthModal);
  authBackdrop.addEventListener('click', closeAuthModal);
  authForm.addEventListener('submit', handleSubmit);

  document.addEventListener('auth:gate', () => openAuthModal(GREETING_TEXT));

  document.addEventListener('pending:send', (e) => {
    const text = e.detail.text;
    clearPending();
    if (appState.user) {
      fillQuestionInput(text);
    } else {
      writePending(text);
      openAuthModal(GREETING_TEXT);
    }
  });
  document.addEventListener('pending:dismiss', () => clearPending());
}
