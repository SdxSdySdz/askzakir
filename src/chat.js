import { appState, AYATS, PLACEHOLDER_RESPONSE, writePending, clearPending } from './state.js';
import { api } from './api.js';

const chatArea     = document.getElementById('chat-area');
const inputWrapper = document.querySelector('.input-wrapper');
const input        = inputWrapper.querySelector('textarea');
const skipBtn      = document.getElementById('btn-skip-thinking');
const pendingPill  = document.getElementById('pending-pill');
const pendingText  = pendingPill.querySelector('.pending-text');
const pendingSend  = document.getElementById('pending-send');

// Локальное chat-состояние. Не торчит в appState, потому что эфемерное.
let busy = false;
let thinkingTimer = null;
let streamTimer   = null;
let activeAyatCard = null;
let activeResponseSlot = null;

function setBusy(state) {
  busy = state;
  input.disabled = state;
  inputWrapper.classList.toggle('busy', state);
  skipBtn.disabled = !state || !thinkingTimer;
}

export function isBusy() { return busy; }

function pickAyat() {
  return AYATS[Math.floor(Math.random() * AYATS.length)];
}

function ornamentCorners() {
  return `
    <svg class="ornament tl"><use href="#ornament-corner"/></svg>
    <svg class="ornament tr"><use href="#ornament-corner"/></svg>
    <svg class="ornament bl"><use href="#ornament-corner"/></svg>
    <svg class="ornament br"><use href="#ornament-corner"/></svg>
  `;
}

function buildAyatCard(ayat) {
  const card = document.createElement('div');
  card.className = 'ayat-card';
  card.innerHTML = `
    ${ornamentCorners()}
    <div class="ayat-arabic">${ayat.arabic}</div>
    <div class="ornament-divider">
      <svg><use href="#ornament-star"/></svg>
    </div>
    <div class="ayat-translation">«${ayat.translation}»</div>
    <div class="ayat-source">${ayat.source}</div>
  `;
  return card;
}

function scrollChatToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

// «Фейковый» стрим по словам ~30 мс. В Phase 1 будет заменён реальным SSE-парсером.
function streamResponse(text, target, doneCb) {
  target.classList.add('visible');
  const words = text.split(/(\s+)/);
  let i = 0;
  const caret = document.createElement('span');
  caret.className = 'caret';
  target.appendChild(caret);

  const tick = () => {
    if (i >= words.length) {
      caret.remove();
      streamTimer = null;
      doneCb && doneCb();
      return;
    }
    target.insertBefore(document.createTextNode(words[i]), caret);
    i++;
    scrollChatToBottom();
    const delay = /^\s+$/.test(words[i - 1]) ? 0 : 30;
    streamTimer = setTimeout(tick, delay);
  };
  tick();
}

function beginAnswer(responseSlot, aiText) {
  if (activeAyatCard) {
    const card = activeAyatCard;
    card.classList.add('leaving');
    card.classList.remove('visible');
    setTimeout(() => card.remove(), 600);
    activeAyatCard = null;
  }

  const ai = document.createElement('div');
  ai.className = 'ai-response';
  responseSlot.appendChild(ai);
  setTimeout(() => {
    streamResponse(aiText || PLACEHOLDER_RESPONSE, ai, () => {
      setBusy(false);
      input.focus();
    });
  }, 350);
}

// Анимированный turn: user-msg сверху сжимается, ниже аят, через 4-7с ответ стримится.
function runTurnAnimation(userText, aiText) {
  const turn = document.createElement('div');
  turn.className = 'turn';

  const userMsg = document.createElement('div');
  userMsg.className = 'user-msg';
  userMsg.textContent = userText;
  userMsg.title = userText;

  const responseSlot = document.createElement('div');
  responseSlot.className = 'response-slot';
  activeResponseSlot = responseSlot;

  turn.appendChild(userMsg);
  turn.appendChild(responseSlot);
  chatArea.appendChild(turn);
  scrollChatToBottom();

  requestAnimationFrame(() => {
    userMsg.classList.add('entered');
    setTimeout(() => {
      userMsg.classList.add('collapsed');
      scrollChatToBottom();
    }, 450);
  });

  const ayat = pickAyat();
  const card = buildAyatCard(ayat);
  responseSlot.appendChild(card);
  activeAyatCard = card;
  requestAnimationFrame(() => {
    card.classList.add('visible');
    scrollChatToBottom();
  });

  const thinkingMs = 4000 + Math.floor(Math.random() * 3000);
  thinkingTimer = setTimeout(() => {
    thinkingTimer = null;
    skipBtn.disabled = true;
    beginAnswer(responseSlot, aiText);
  }, thinkingMs);
  skipBtn.disabled = false;
}

// Статический рендер истории: ни анимаций, ни аята, ни caret-а.
export function renderHistoricalTurn(userText, aiText) {
  const turn = document.createElement('div');
  turn.className = 'turn';

  const userMsg = document.createElement('div');
  userMsg.className = 'user-msg entered collapsed';
  userMsg.textContent = userText;
  userMsg.title = userText;

  const responseSlot = document.createElement('div');
  responseSlot.className = 'response-slot';
  const ai = document.createElement('div');
  ai.className = 'ai-response visible';
  ai.textContent = aiText;
  responseSlot.appendChild(ai);

  turn.appendChild(userMsg);
  turn.appendChild(responseSlot);
  chatArea.appendChild(turn);
}

export function clearChatArea() {
  chatArea.innerHTML = '';
  activeAyatCard = null;
  activeResponseSlot = null;
  if (thinkingTimer) { clearTimeout(thinkingTimer); thinkingTimer = null; }
  if (streamTimer)   { clearTimeout(streamTimer);   streamTimer = null; }
  skipBtn.disabled = true;
}

function clearInput() {
  input.value = '';
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 200) + 'px';
  inputWrapper.classList.remove('has-text');
}

function showFloatingError(msg) {
  pendingText.textContent = msg;
  pendingSend.hidden = true;
  pendingPill.hidden = false;
  setTimeout(() => {
    pendingPill.hidden = true;
    pendingSend.hidden = false;
    pendingText.textContent = 'У вас остался незаданный вопрос';
  }, 3000);
}

// Основная функция отправки. Вызывается из main.js (Cmd+Enter), auth.js (после login),
// drawer.js (pending pill «Отправить»).
export async function send(text) {
  if (busy || !text.trim()) return;

  // Static-mode (GH Pages): backend нет, фолбэк на локальный placeholder.
  if (appState.staticMode) {
    setBusy(true);
    runTurnAnimation(text, PLACEHOLDER_RESPONSE);
    return;
  }

  // Аноним: сохраняем вопрос в pending и просим открыть auth-модалку через событие.
  if (!appState.user) {
    writePending(text);
    document.dispatchEvent(new CustomEvent('auth:gate', { detail: { reason: 'anon-send' } }));
    return;
  }

  setBusy(true);
  const targetId = appState.currentChatId == null ? 'new' : appState.currentChatId;
  let resp;
  try {
    resp = await api('POST', `/api/chats/${targetId}/messages`, { content: text });
  } catch (err) {
    setBusy(false);
    if (err.status === 401) {
      appState.user = null;
      writePending(text);
      document.dispatchEvent(new CustomEvent('auth:gate', { detail: { reason: 'session-expired' } }));
    } else {
      showFloatingError(err.code === 'network' ? 'Нет соединения' : 'Не удалось отправить');
      input.value = text;
      inputWrapper.classList.toggle('has-text', text.length > 0);
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 200) + 'px';
    }
    return;
  }

  appState.currentChatId = resp.chatId;
  runTurnAnimation(resp.userMessage.content, resp.aiMessage.content);
  // Просим drawer обновить список чатов (новый чат / поменялся updated_at).
  document.dispatchEvent(new CustomEvent('chats:dirty'));
}

// Skip-thinking — функционально привязан к chat.thinkingTimer, поэтому слушатель здесь.
export function initChat() {
  skipBtn.addEventListener('click', () => {
    if (!thinkingTimer) return;
    clearTimeout(thinkingTimer);
    thinkingTimer = null;
    skipBtn.disabled = true;
    if (activeResponseSlot) {
      beginAnswer(activeResponseSlot, PLACEHOLDER_RESPONSE);
    }
  });
}
