import { appState, GREETING_TEXT, readPending, writePending, clearPending } from './state.js';
import { fillQuestionInput } from './chat.js';

const authModal = document.getElementById('auth-modal');
const authBackdrop = document.getElementById('auth-backdrop');
const authTitle = document.getElementById('auth-title');
const authGreeting = document.getElementById('auth-greeting');
const authError = document.getElementById('auth-error');
const authCloseBtn = document.getElementById('auth-close');

export function openAuthModal(greetingText) {
  if (authTitle) authTitle.textContent = 'Вход через Google';
  if (authError) authError.textContent = '';
  if (greetingText && authGreeting) {
    authGreeting.textContent = greetingText;
    authGreeting.hidden = false;
  } else if (authGreeting) {
    authGreeting.hidden = true;
  }
  if (authBackdrop) authBackdrop.classList.add('open');
  if (authModal) authModal.classList.add('open');
}

export function closeAuthModal() {
  if (authModal) authModal.classList.remove('open');
  if (authBackdrop) authBackdrop.classList.remove('open');
}

export function showAuthError(message) {
  if (authError) {
    authError.textContent = message;
    openAuthModal();
  }
}

export function initAuth() {
  if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);
  if (authBackdrop) authBackdrop.addEventListener('click', closeAuthModal);

  document.addEventListener('auth:gate', () => openAuthModal(GREETING_TEXT));
  document.addEventListener('auth:success', () => closeAuthModal());

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

  // Check URL parameters for OAuth errors
  const urlParams = new URLSearchParams(window.location.search);
  const authErr = urlParams.get('auth_error');
  if (authErr) {
    const errorMessages = {
      state_mismatch: 'Ошибка проверки сессии входа. Пожалуйста, попробуйте еще раз.',
      token_exchange_failed: 'Не удалось подтвердить вход в Google. Попробуйте еще раз.',
      userinfo_failed: 'Не удалось получить данные профиля Google.',
      access_denied: 'Вход через Google был отменен.',
    };
    showAuthError(errorMessages[authErr] || `Ошибка авторизации: ${authErr}`);
  }
}
