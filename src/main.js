import { appState, readPending } from './state.js';
import { api } from './api.js';
import { initVideo, showUI, startVideo, stopVideo, tryUnmute } from './video.js';
import { send, initChat } from './chat.js';
import { initDrawer, loadChats, renderDrawerFooter, hideDrawerForStaticMode } from './drawer.js';
import { initAuth, closeAuthModal } from './auth.js';
import { initLanding, showLanding, hideLanding } from './landing.js';
import { initDevPanel } from './devpanel.js';
import { initFrontendSentry, reportFrontendError } from './observability.js';
import { initBilling, setBilling } from './billing.js?v=20260709-1938';

const inputWrapper = document.querySelector('.input-wrapper');
const input        = inputWrapper.querySelector('textarea');
const inputSend    = document.getElementById('input-send');
const pendingPill  = document.getElementById('pending-pill');
const pendingText  = pendingPill.querySelector('.pending-text');

// ─── Input plumbing ───────────────────────────────────────────────────────
function autoresize() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 200) + 'px';
}

function initInput() {
  function submitInput() {
    const value = input.value;
    if (!value.trim()) return;
    send(value);
  }

  // Cmd/Ctrl + Enter — отправка; plain Enter — обычный перенос строки (textarea).
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submitInput();
    }
  });
  inputSend.addEventListener('click', submitInput);
  input.addEventListener('input', () => {
    autoresize();
    inputWrapper.classList.toggle('has-text', input.value.length > 0);
  });
  autoresize();
}

// ─── Глобальные обработчики click/keydown для unmute+showUI ──────────────
function canActivateVideo() {
  return Boolean(appState.user || appState.staticMode);
}

function initGlobalGestureHandlers() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('#dev-panel')) return;
    if (!canActivateVideo()) return;
    if (e.target.closest('.input-wrapper')) { tryUnmute(); return; }
    tryUnmute();
    showUI();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('#dev-panel')) return;
    if (!canActivateVideo()) return;
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
  const urlParams = new URLSearchParams(window.location.search);
  const authSuccess = urlParams.get('auth_success');
  const authErr = urlParams.get('auth_error');
  if (authSuccess || authErr) {
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  try {
    const { user, billing } = await api('GET', '/api/me');
    appState.user = user;
    setBilling(billing);
    closeAuthModal();
    hideLanding();
    startVideo();
    renderDrawerFooter();
    await loadChats();

    const pending = readPending();
    if (pending) {
      pendingText.textContent = pending.length > 60 ? pending.slice(0, 60).trimEnd() + '…' : pending;
      pendingPill.hidden = false;
    }
  } catch (err) {
    if (err.status === 401) {
      showLanding();
      return;
    }
    // Бэк недоступен (404/network) → GitHub Pages-демо: static-mode + спрятать drawer.
    appState.staticMode = true;
    hideDrawerForStaticMode();
  }
}

// ─── Entry ────────────────────────────────────────────────────────────────
function initApp() {
  initFrontendSentry();
  window.addEventListener('error',              (e) => reportFrontendError(e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => reportFrontendError(e.reason));

  initVideo();
  initChat();
  initDrawer();
  initAuth();
  initBilling();
  initLanding();
  initDevPanel();
  initInput();
  initGlobalGestureHandlers();
  document.addEventListener('auth:success', () => startVideo({ preferSound: true }));
  document.addEventListener('auth:logout', () => {
    stopVideo();
    showLanding();
  });
  bootstrap();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
