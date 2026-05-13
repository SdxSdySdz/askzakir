import { appState, GREETING_TEXT, readPending, clearPending } from './state.js';
import { api, AUTH_ERROR_MAP } from './api.js';
import { send } from './chat.js';
import { loadChats, renderDrawerFooter, closeDrawer } from './drawer.js';

const authModal    = document.getElementById('auth-modal');
const authBackdrop = document.getElementById('auth-backdrop');
const authForm     = document.getElementById('auth-form');
const authTitle    = document.getElementById('auth-title');
const authGreeting = document.getElementById('auth-greeting');
const authError    = document.getElementById('auth-error');
const authSubmit   = document.getElementById('auth-submit');
const authToggleText = document.getElementById('auth-toggle-text');
const authToggleBtn  = document.getElementById('auth-toggle-btn');
const authCloseBtn   = document.getElementById('auth-close');
const authLogin    = document.getElementById('auth-login');
const authPassword = document.getElementById('auth-password');
const inputWrapper = document.querySelector('.input-wrapper');
const inputEl     = inputWrapper.querySelector('textarea');

let mode = 'register';

export function openAuthModal(_mode, greetingText) {
  mode = _mode || 'register';
  if (greetingText) {
    authGreeting.textContent = greetingText;
    authGreeting.hidden = false;
  } else {
    authGreeting.hidden = true;
  }
  applyMode();
  authError.textContent = '';
  authBackdrop.classList.add('open');
  authModal.classList.add('open');
  setTimeout(() => authLogin.focus(), 60);
}

export function closeAuthModal() {
  authModal.classList.remove('open');
  authBackdrop.classList.remove('open');
}

function applyMode() {
  if (mode === 'register') {
    authTitle.textContent = 'Создание аккаунта';
    authSubmit.textContent = 'Зарегистрироваться';
    authToggleText.textContent = 'Уже есть аккаунт?';
    authToggleBtn.textContent = 'Войти';
    authPassword.setAttribute('autocomplete', 'new-password');
  } else {
    authTitle.textContent = 'Вход';
    authSubmit.textContent = 'Войти';
    authToggleText.textContent = 'Ещё нет аккаунта?';
    authToggleBtn.textContent = 'Зарегистрироваться';
    authPassword.setAttribute('autocomplete', 'current-password');
  }
}

function clearInput() {
  inputEl.value = '';
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 200) + 'px';
  inputWrapper.classList.remove('has-text');
}

async function handleSubmit(e) {
  e.preventDefault();
  if (authSubmit.disabled) return;
  const login = authLogin.value.trim().toLowerCase();
  const password = authPassword.value;
  if (!login || !password) { authError.textContent = 'Заполните оба поля'; return; }
  if (password.length < 8)  { authError.textContent = AUTH_ERROR_MAP.invalid_password; return; }

  authError.textContent = '';
  authSubmit.disabled = true;
  const original = authSubmit.textContent;
  authSubmit.textContent = '…';

  try {
    const path = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const { user } = await api('POST', path, { login, password });
    appState.user = user;
    closeAuthModal();
    authForm.reset();
    await loadChats();
    renderDrawerFooter();
    const pending = readPending();
    if (pending) {
      clearPending();
      clearInput();           // вопрос станет user-сообщением в чате, в input он больше не нужен
      appState.currentChatId = 'new';
      send(pending);
    }
  } catch (err) {
    authError.textContent = AUTH_ERROR_MAP[err.code] || AUTH_ERROR_MAP.unknown;
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = original;
  }
}

export function initAuth() {
  authToggleBtn.addEventListener('click', () => {
    mode = mode === 'register' ? 'login' : 'register';
    authError.textContent = '';
    applyMode();
  });
  authCloseBtn.addEventListener('click', closeAuthModal);
  authBackdrop.addEventListener('click', closeAuthModal);
  authForm.addEventListener('submit', handleSubmit);

  // chat.send() при анонимной отправке кидает это событие.
  document.addEventListener('auth:gate', () => openAuthModal('register', GREETING_TEXT));

  // pending-pill в drawer выпускает эти события.
  document.addEventListener('pending:send', (e) => {
    clearPending();
    send(e.detail.text);
  });
  document.addEventListener('pending:dismiss', () => clearPending());
}
