import { appState, readPending } from './state.js';
import { api } from './api.js';
import { initVideo, showUI, tryUnmute } from './video.js';
import { send, initChat } from './chat.js';
import { initDrawer, loadChats, renderDrawerFooter, hideDrawerForStaticMode } from './drawer.js';
import { initAuth } from './auth.js';
import { initDevPanel } from './devpanel.js';
import { initFrontendSentry, reportFrontendError } from './observability.js';

const inputWrapper = document.querySelector('.input-wrapper');
const input        = inputWrapper.querySelector('textarea');
const pendingPill  = document.getElementById('pending-pill');
const pendingText  = pendingPill.querySelector('.pending-text');

// ─── Input plumbing ───────────────────────────────────────────────────────
function autoresize() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 200) + 'px';
}

function clearInput() {
  input.value = '';
  autoresize();
  inputWrapper.classList.remove('has-text');
}

function initInput() {
  // Cmd/Ctrl + Enter — отправка; plain Enter — обычный перенос строки (textarea).
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const value = input.value;
      if (!value.trim()) return;
      // В anon-flow textarea оставляем — модалка оверлей и юзер должен видеть свой вопрос.
      if (appState.user || appState.staticMode) clearInput();
      send(value);
    }
  });
  input.addEventListener('input', () => {
    autoresize();
    inputWrapper.classList.toggle('has-text', input.value.length > 0);
  });
  autoresize();
}

// ─── Глобальные обработчики click/keydown для unmute+showUI ──────────────
function initGlobalGestureHandlers() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('#dev-panel')) return;
    if (e.target.closest('.input-wrapper')) { tryUnmute(); return; }
    tryUnmute();
    showUI();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('#dev-panel')) return;
    tryUnmute();
    if (typeof e.key === 'string' && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Если UI ещё скрыт — раскрываем и фокусируемся в textarea на первой печатной клавише.
      showUI();
      input.focus();
    }
    if (e.key === 'Escape') {
      // Закрываем модалки и дровер по Esc.
      const am = document.getElementById('auth-modal');
      if (am.classList.contains('open')) am.classList.remove('open');
      const ab = document.getElementById('auth-backdrop');
      if (ab.classList.contains('open')) ab.classList.remove('open');
      const dr = document.getElementById('drawer');
      if (dr.classList.contains('open')) {
        dr.classList.remove('open');
        document.getElementById('drawer-backdrop').classList.remove('open');
      }
    }
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    const { user } = await api('GET', '/api/me');
    appState.user = user;
    renderDrawerFooter();
    await loadChats();

    const pending = readPending();
    if (pending) {
      pendingText.textContent = pending.length > 60 ? pending.slice(0, 60).trimEnd() + '…' : pending;
      pendingPill.hidden = false;
    }
  } catch (err) {
    if (err.status === 401) return; // нормальный аноним
    // Бэк недоступен (404/network) → GitHub Pages-демо: static-mode + спрятать drawer.
    appState.staticMode = true;
    hideDrawerForStaticMode();
  }
}

// ─── Entry ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initFrontendSentry();
  window.addEventListener('error',              (e) => reportFrontendError(e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => reportFrontendError(e.reason));

  initVideo();
  initChat();
  initDrawer();
  initAuth();
  initDevPanel();
  initInput();
  initGlobalGestureHandlers();
  bootstrap();
});
