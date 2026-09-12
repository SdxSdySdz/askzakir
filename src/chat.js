import { appState, AYATS, PLACEHOLDER_RESPONSE, writePending } from './state.js';
import { api } from './api.js';
import { renderMarkdown } from './markdown.js?v=20260709-1548';

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
let activeTurnState = null;

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

function chatTopInset() {
  return parseFloat(getComputedStyle(chatArea).paddingTop) || 0;
}

function clearScrollTail() {
  chatArea.style.setProperty('--chat-tail-space', '0px');
}

function reserveTailForTurn(turn) {
  const topInset = chatTopInset();
  const anchor = turn.querySelector('.user-msg');
  const anchorHeight = anchor ? Math.min(anchor.offsetHeight || 0, 72) : turn.offsetHeight;
  const tail = Math.max(0, chatArea.clientHeight - anchorHeight - topInset);
  chatArea.style.setProperty('--chat-tail-space', `${Math.ceil(tail)}px`);
}

function scrollTurnToTop(turn) {
  reserveTailForTurn(turn);
  const areaRect = chatArea.getBoundingClientRect();
  const turnRect = turn.getBoundingClientRect();
  const target = chatArea.scrollTop + turnRect.top - areaRect.top - chatTopInset();
  const maxTop = Math.max(0, chatArea.scrollHeight - chatArea.clientHeight);
  chatArea.scrollTo({
    top: Math.max(0, Math.min(target, maxTop)),
    behavior: 'smooth',
  });
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
      target.innerHTML = renderMarkdown(text);
      streamTimer = null;
      doneCb && doneCb();
      return;
    }
    target.insertBefore(document.createTextNode(words[i]), caret);
    i++;
    const delay = /^\s+$/.test(words[i - 1]) ? 0 : 30;
    streamTimer = setTimeout(tick, delay);
  };
  tick();
}

function maybeStartAnswer(turnState) {
  if (!turnState || turnState.canceled || turnState.answerStarted) return;
  if (!turnState.thinkingDone || !turnState.aiReady) return;

  turnState.answerStarted = true;
  const { responseSlot, ayatCard, aiText } = turnState;
  if (ayatCard) {
    const card = ayatCard;
    card.classList.add('leaving');
    card.classList.remove('visible');
    setTimeout(() => card.remove(), 600);
  }

  const ai = document.createElement('div');
  ai.className = 'ai-response';
  responseSlot.appendChild(ai);
  setTimeout(() => {
    streamResponse(aiText || PLACEHOLDER_RESPONSE, ai, () => {
      if (activeTurnState === turnState) {
        activeTurnState = null;
        setBusy(false);
      }
      input.focus();
    });
  }, 350);
}

function cancelTurn(turnState) {
  if (!turnState) return;
  turnState.canceled = true;
  if (turnState.turn?.isConnected) turnState.turn.remove();
  if (activeTurnState === turnState) {
    activeTurnState = null;
    clearScrollTail();
  }
}

// Анимированный turn: user-msg сверху сжимается, ниже аят, дальше ждём реальный ответ.
function runTurnAnimation(userText) {
  const turn = document.createElement('div');
  turn.className = 'turn';

  const userMsg = document.createElement('div');
  userMsg.className = 'user-msg';
  userMsg.textContent = userText;
  userMsg.title = userText;

  const responseSlot = document.createElement('div');
  responseSlot.className = 'response-slot';

  turn.appendChild(userMsg);
  turn.appendChild(responseSlot);
  chatArea.appendChild(turn);

  const ayat = pickAyat();
  const card = buildAyatCard(ayat);
  responseSlot.appendChild(card);

  const turnState = {
    turn,
    userMsg,
    responseSlot,
    ayatCard: card,
    aiText: '',
    aiReady: false,
    thinkingDone: false,
    answerStarted: false,
    canceled: false,
  };
  activeTurnState = turnState;
  scrollTurnToTop(turn);

  requestAnimationFrame(() => {
    userMsg.classList.add('entered');
    card.classList.add('visible');
    setTimeout(() => {
      userMsg.classList.add('collapsed');
    }, 450);
  });

  const thinkingMs = 4000 + Math.floor(Math.random() * 3000);
  thinkingTimer = setTimeout(() => {
    thinkingTimer = null;
    turnState.thinkingDone = true;
    skipBtn.disabled = true;
    maybeStartAnswer(turnState);
  }, thinkingMs);
  skipBtn.disabled = false;
  return turnState;
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
  ai.innerHTML = renderMarkdown(aiText);
  responseSlot.appendChild(ai);

  turn.appendChild(userMsg);
  turn.appendChild(responseSlot);
  chatArea.appendChild(turn);
}

export function clearChatArea() {
  chatArea.innerHTML = '';
  clearScrollTail();
  if (activeTurnState) activeTurnState.canceled = true;
  activeTurnState = null;
  if (thinkingTimer) { clearTimeout(thinkingTimer); thinkingTimer = null; }
  if (streamTimer)   { clearTimeout(streamTimer);   streamTimer = null; }
  setBusy(false);
}

function clearInput() {
  input.value = '';
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 200) + 'px';
  inputWrapper.classList.remove('has-text');
}

export function fillQuestionInput(text) {
  input.value = text;
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 200) + 'px';
  inputWrapper.classList.toggle('has-text', input.value.length > 0);
  input.focus();
}

export function clearQuestionInput() {
  clearInput();
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

// Основная функция отправки. Вызывается из main.js (Cmd+Enter), auth.js (после sign-in),
// drawer.js (pending pill «Отправить»).
export async function send(text) {
  if (busy || !text.trim()) return;

  // Static-mode (GH Pages): backend нет, фолбэк на локальный placeholder.
  if (appState.staticMode) {
    setBusy(true);
    clearInput();
    const turnState = runTurnAnimation(text);
    turnState.aiText = PLACEHOLDER_RESPONSE;
    turnState.aiReady = true;
    maybeStartAnswer(turnState);
    return;
  }

  // Аноним: сохраняем вопрос в pending и просим открыть auth-модалку через событие.
  if (!appState.user) {
    writePending(text);
    document.dispatchEvent(new CustomEvent('auth:gate', { detail: { reason: 'anon-send' } }));
    return;
  }

  if (appState.billing && appState.billing.remaining <= 0) {
    document.dispatchEvent(new CustomEvent('billing:quota-exceeded', {
      detail: { billing: appState.billing, text },
    }));
    return;
  }

  setBusy(true);
  clearInput();
  const turnState = runTurnAnimation(text);
  const targetId = appState.currentChatId == null ? 'new' : appState.currentChatId;
  let resp;
  try {
    resp = await api('POST', `/api/chats/${targetId}/messages`, { content: text });
  } catch (err) {
    setBusy(false);
    cancelTurn(turnState);
    if (err.status === 401) {
      appState.user = null;
      writePending(text);
      document.dispatchEvent(new CustomEvent('auth:gate', { detail: { reason: 'session-expired' } }));
    } else if (err.status === 402 || err.code === 'quota_exceeded') {
      if (err.data?.billing) {
        document.dispatchEvent(new CustomEvent('billing:quota-exceeded', {
          detail: { billing: err.data.billing, text },
        }));
      }
      input.value = text;
      inputWrapper.classList.toggle('has-text', text.length > 0);
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 200) + 'px';
    } else {
      showFloatingError(err.code === 'network' ? 'Нет соединения' : 'Не удалось отправить');
      input.value = text;
      inputWrapper.classList.toggle('has-text', text.length > 0);
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 200) + 'px';
    }
    return;
  }

  if (turnState.canceled) {
    document.dispatchEvent(new CustomEvent('chats:dirty'));
    return;
  }

  appState.currentChatId = resp.chatId;
  if (resp.billing) {
    document.dispatchEvent(new CustomEvent('billing:update', { detail: { billing: resp.billing } }));
  }
  turnState.aiText = resp.aiMessage.content;
  turnState.aiReady = true;
  maybeStartAnswer(turnState);
  // Просим drawer обновить список чатов (новый чат / поменялся updated_at).
  document.dispatchEvent(new CustomEvent('chats:dirty'));
}

// Skip-thinking — функционально привязан к chat.thinkingTimer, поэтому слушатель здесь.
export function initChat() {
  skipBtn.addEventListener('click', () => {
    if (!thinkingTimer) return;
    clearTimeout(thinkingTimer);
    thinkingTimer = null;
    if (activeTurnState) activeTurnState.thinkingDone = true;
    skipBtn.disabled = true;
    maybeStartAnswer(activeTurnState);
  });
}
