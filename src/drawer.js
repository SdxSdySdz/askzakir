import { appState, readPending } from './state.js';
import { api } from './api.js';
import { clearChatArea, renderHistoricalTurn, isBusy, send } from './chat.js';

const drawerEl       = document.getElementById('drawer');
const drawerBackdrop = document.getElementById('drawer-backdrop');
const drawerToggle   = document.getElementById('drawer-toggle');
const drawerList     = document.getElementById('drawer-list');
const drawerEmpty    = document.getElementById('drawer-empty');
const drawerFooter   = document.getElementById('drawer-footer');
const drawerUserLogin= document.getElementById('drawer-user-login');
const drawerLogoutBt = document.getElementById('drawer-logout');
const newChatBtn     = document.getElementById('btn-new-chat');
const pendingPill    = document.getElementById('pending-pill');
const pendingSendBtn = document.getElementById('pending-send');
const pendingDismissBtn = document.getElementById('pending-dismiss');
const inputEl        = document.querySelector('.input-wrapper textarea');

export function openDrawer()  { drawerEl.classList.add('open');    drawerBackdrop.classList.add('open'); }
export function closeDrawer() { drawerEl.classList.remove('open'); drawerBackdrop.classList.remove('open'); }

export function renderDrawerFooter() {
  if (appState.user) {
    drawerFooter.hidden = false;
    drawerUserLogin.textContent = appState.user.login;
  } else {
    drawerFooter.hidden = true;
  }
}

function renderDrawerList() {
  drawerList.innerHTML = '';
  if (!appState.chats.length) {
    drawerEmpty.hidden = false;
    return;
  }
  drawerEmpty.hidden = true;
  for (const chat of appState.chats) {
    const li = document.createElement('li');
    li.className = 'drawer-item' + (chat.id === appState.currentChatId ? ' active' : '');
    li.textContent = chat.title;
    li.title = chat.title;
    li.addEventListener('click', () => selectChat(chat.id));
    drawerList.appendChild(li);
  }
}

export async function loadChats() {
  if (!appState.user) return;
  try {
    const { chats } = await api('GET', '/api/chats');
    appState.chats = chats;
    renderDrawerList();
  } catch {
    // тихо — дровер просто покажет «История пуста» / прошлое состояние
  }
}

async function selectChat(id) {
  if (isBusy()) return;
  closeDrawer();
  try {
    const { chat } = await api('GET', `/api/chats/${id}`);
    appState.currentChatId = chat.id;
    clearChatArea();
    const messages = chat.messages;
    // Пары user/assistant в порядке создания → исторический рендер.
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role !== 'user') continue;
      const next = messages[i + 1];
      const aiText = next && next.role === 'assistant' ? next.content : '';
      renderHistoricalTurn(messages[i].content, aiText);
      if (next && next.role === 'assistant') i++;
    }
    renderDrawerList();
    document.getElementById('chat-area').scrollTop = document.getElementById('chat-area').scrollHeight;
  } catch {
    // тихо
  }
}

function newChat() {
  appState.currentChatId = 'new';
  clearChatArea();
  renderDrawerList();
  closeDrawer();
  inputEl.focus();
}

async function logout() {
  try { await api('POST', '/api/auth/logout'); } catch {}
  appState.user = null;
  appState.chats = [];
  appState.currentChatId = null;
  clearChatArea();
  renderDrawerList();
  renderDrawerFooter();
  closeDrawer();
}

export function initDrawer() {
  drawerToggle.addEventListener('click', () => {
    if (drawerEl.classList.contains('open')) closeDrawer(); else openDrawer();
  });
  drawerBackdrop.addEventListener('click', closeDrawer);

  newChatBtn.addEventListener('click', () => {
    if (!appState.user) {
      document.dispatchEvent(new CustomEvent('auth:gate', { detail: { reason: 'new-chat' } }));
      return;
    }
    newChat();
  });

  drawerLogoutBt.addEventListener('click', logout);

  // chats:dirty приходит из chat.send() после успешной отправки → обновляем список.
  document.addEventListener('chats:dirty', () => { loadChats(); });

  // Pending pill — мягкое предложение отправить сохранённый при анонимной попытке вопрос.
  pendingSendBtn.addEventListener('click', () => {
    const text = readPending();
    pendingPill.hidden = true;
    if (text) {
      // dispatch вместо прямого импорта auth.js / pending.js — избегаем циклов
      document.dispatchEvent(new CustomEvent('pending:send', { detail: { text } }));
    }
  });
  pendingDismissBtn.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('pending:dismiss'));
    pendingPill.hidden = true;
  });
}

// staticMode: дровер вообще не нужен.
export function hideDrawerForStaticMode() {
  drawerToggle.hidden = true;
}
