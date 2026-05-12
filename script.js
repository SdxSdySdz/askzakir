// ─────────────────────────────────────────────────────────────
// Hardcoded selection of well-known, significant Quranic verses.
// Each entry: arabic, translation (Russian), source label.
// ─────────────────────────────────────────────────────────────
const AYATS = [
  {
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    translation: 'Во имя Аллаха, Милостивого, Милосердного.',
    source: 'Сура 1 «Аль-Фатиха», аят 1',
  },
  {
    arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    translation: 'Тебе одному мы поклоняемся и Тебя одного молим о помощи.',
    source: 'Сура 1 «Аль-Фатиха», аят 5',
  },
  {
    arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ',
    translation: 'Поминайте Меня — и Я буду помнить о вас.',
    source: 'Сура 2 «Аль-Бакара», аят 152',
  },
  {
    arabic: 'وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ',
    translation: 'Обратитесь за помощью к терпению и молитве. Воистину, Аллах — с терпеливыми.',
    source: 'Сура 2 «Аль-Бакара», аят 153',
  },
  {
    arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ',
    translation: 'Когда Мои рабы спрашивают тебя обо Мне — то ведь Я близок.',
    source: 'Сура 2 «Аль-Бакара», аят 186',
  },
  {
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
    translation: 'Аллах — нет божества, кроме Него, Живого, Поддерживающего жизнь.',
    source: 'Сура 2 «Аль-Бакара», аят 255 (аят аль-Курси)',
  },
  {
    arabic: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',
    translation: 'Аллах не возлагает на душу ничего, что было бы ей не по силам.',
    source: 'Сура 2 «Аль-Бакара», аят 286',
  },
  {
    arabic: 'رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا',
    translation: 'Господь наш! Не уклоняй наши сердца в сторону после того, как Ты наставил нас на прямой путь.',
    source: 'Сура 3 «Аль ʿИмран», аят 8',
  },
  {
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    translation: 'Нам достаточно Аллаха, и Он — Прекрасный Покровитель.',
    source: 'Сура 3 «Аль ʿИмран», аят 173',
  },
  {
    arabic: 'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنْفُسِهِمْ',
    translation: 'Воистину, Аллах не меняет положения людей, пока они не изменят самих себя.',
    source: 'Сура 13 «Ар-Раʿд», аят 11',
  },
  {
    arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    translation: 'Воистину, сердца находят покой в поминании Аллаха.',
    source: 'Сура 13 «Ар-Раʿд», аят 28',
  },
  {
    arabic: 'رَبِّ أَدْخِلْنِي مُدْخَلَ صِدْقٍ وَأَخْرِجْنِي مُخْرَجَ صِدْقٍ',
    translation: 'Господи! Введи меня входом истины и выведи меня выходом истины.',
    source: 'Сура 17 «Аль-Исра», аят 80',
  },
  {
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    translation: 'Господи! Приумножь моё знание.',
    source: 'Сура 20 «Та-Ха», аят 114',
  },
  {
    arabic: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    translation: 'Нет божества, кроме Тебя! Пречист Ты! Воистину, я был из числа беззаконников.',
    source: 'Сура 21 «Аль-Анбийа», аят 87',
  },
  {
    arabic: 'رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ',
    translation: 'Господи! Я нуждаюсь в любом благе, которое Ты ниспошлёшь мне.',
    source: 'Сура 28 «Аль-Касас», аят 24',
  },
  {
    arabic: 'لَا تَقْنَطُوا مِنْ رَحْمَةِ اللَّهِ',
    translation: 'Не отчаивайтесь в милости Аллаха.',
    source: 'Сура 39 «Аз-Зумар», аят 53',
  },
  {
    arabic: 'وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
    translation: 'Тому, кто уповает на Аллаха, достаточно Его.',
    source: 'Сура 65 «Ат-Талак», аят 3',
  },
  {
    arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    translation: 'Воистину, вместе с трудностью наступает облегчение. Воистину, вместе с трудностью наступает облегчение.',
    source: 'Сура 94 «Аш-Шарх», аяты 5–6',
  },
  {
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ',
    translation: 'Скажи: «Он — Аллах Единый, Аллах Самодостаточный».',
    source: 'Сура 112 «Аль-Ихлас», аяты 1–2',
  },
  {
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً',
    translation: 'Господь наш! Одари нас добром в этом мире и добром в Последней жизни.',
    source: 'Сура 2 «Аль-Бакара», аят 201',
  },
];

// Templated AI response (placeholder; server returns the same text).
const PLACEHOLDER_RESPONSE =
  'Этот ответ — временный шаблон. В будущем здесь появится осмысленный ответ ' +
  'нейронной сети. Пока что текст выводится в режиме потоковой передачи, ' +
  'слово за словом, чтобы вы могли почувствовать ритм будущего общения.';

const GREETING_TEXT =
  'Ассаламу Алейкум, Брат/Сестра. Спасибо за Ваш вопрос. Мы его сохранили. ' +
  'Зарегистрируйтесь и получите на него ответ бесплатно.';

const PENDING_KEY = 'askzakir:pendingQuestion';

const AUTH_ERROR_MAP = {
  invalid_login:       'Логин: 3–32 символа, латиница, цифры, _ . -',
  invalid_password:    'Пароль должен быть от 8 символов',
  login_taken:         'Этот логин уже занят',
  invalid_credentials: 'Неверный логин или пароль',
  rate_limited:        'Слишком много попыток. Попробуйте позже.',
  network:             'Нет соединения с сервером',
  unknown:             'Что-то пошло не так. Попробуйте ещё раз.',
};

document.addEventListener('DOMContentLoaded', () => {
  const intro = document.getElementById('video-intro');
  const loop = document.getElementById('video-loop');
  const ui = document.getElementById('ui-container');
  const blur = document.getElementById('blur-overlay');
  const chatArea = document.getElementById('chat-area');
  const inputWrapper = document.querySelector('.input-wrapper');
  const input = inputWrapper.querySelector('textarea');
  const skipBtn = document.getElementById('btn-skip-thinking');

  function autoresize() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 200) + 'px';
  }

  let shown = false;
  let unmuted = false;

  function tryUnmute() {
    if (unmuted) return;
    unmuted = true;
    // Yandex treats a delayed `muted=false` on an autoplaying element as a fresh
    // unmuted-play request and may refuse it. Wrap the unmute in an explicit
    // pause→play cycle inside the click handler — this counts as a clean
    // user-initiated play() and is accepted in browsers we've tested.
    function explicitUnmute(el) {
      if (el.ended) return;
      const t = el.currentTime;
      el.pause();
      el.muted = false;
      el.currentTime = t;
      el.play().catch(() => {
        // Browser explicitly rejected unmuted play — restore muted playback.
        el.muted = true;
        el.play().catch(() => {});
      });
      // Defensive: some browsers pause asynchronously WITHOUT rejecting play().
      // After a tick, if the element is paused (and not at end), force muted resume.
      setTimeout(() => {
        if (el.paused && !el.ended) {
          el.muted = true;
          el.play().catch(() => {});
        }
      }, 250);
    }
    explicitUnmute(intro);
    if (loop.classList.contains('active')) explicitUnmute(loop);
  }

  function showUI() {
    if (shown) return;
    shown = true;
    blur.classList.add('visible');
    ui.classList.add('visible');
  }

  intro.addEventListener('ended', () => {
    loop.classList.add('active');
    loop.play();
  });

  intro.addEventListener('playing', () => {
    setTimeout(showUI, 4000);
  });

  intro.play().catch(() => {});
  setTimeout(showUI, 6000);

  document.addEventListener('click', (e) => {
    if (e.target.closest('#dev-panel')) return;
    if (e.target.closest('.input-wrapper')) {
      tryUnmute();
      return;
    }
    tryUnmute();
    showUI();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.closest('#dev-panel')) return;
    tryUnmute();
    if (!shown && typeof e.key === 'string' && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      showUI();
      input.focus();
    }
  });

  // ─────────────────────────────────────────────────────────────
  // App state
  // ─────────────────────────────────────────────────────────────
  const appState = {
    user: null,           // {login} | null
    currentChatId: null,  // number | 'new' | null
    chats: [],            // [{id, title, updated_at}]
    staticMode: false,    // true когда backend недоступен (GitHub Pages-демо)
  };

  const drawerEl = document.getElementById('drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const drawerToggle = document.getElementById('drawer-toggle');
  const drawerList = document.getElementById('drawer-list');
  const drawerEmpty = document.getElementById('drawer-empty');
  const drawerFooter = document.getElementById('drawer-footer');
  const drawerUserLogin = document.getElementById('drawer-user-login');
  const drawerLogoutBtn = document.getElementById('drawer-logout');
  const newChatBtn = document.getElementById('btn-new-chat');

  const authModal = document.getElementById('auth-modal');
  const authBackdrop = document.getElementById('auth-backdrop');
  const authForm = document.getElementById('auth-form');
  const authTitle = document.getElementById('auth-title');
  const authGreeting = document.getElementById('auth-greeting');
  const authError = document.getElementById('auth-error');
  const authSubmit = document.getElementById('auth-submit');
  const authToggleText = document.getElementById('auth-toggle-text');
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  const authCloseBtn = document.getElementById('auth-close');
  const authLoginInput = document.getElementById('auth-login');
  const authPasswordInput = document.getElementById('auth-password');

  const pendingPill = document.getElementById('pending-pill');
  const pendingPillText = pendingPill.querySelector('.pending-text');
  const pendingSendBtn = document.getElementById('pending-send');
  const pendingDismissBtn = document.getElementById('pending-dismiss');

  // ─────────────────────────────────────────────────────────────
  // Fetch wrapper
  // ─────────────────────────────────────────────────────────────
  async function api(method, path, body) {
    const opts = {
      method,
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'fetch' },
    };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(path, opts);
    } catch {
      throw { status: 0, code: 'network' };
    }
    let data = null;
    if (res.status !== 204) {
      try { data = await res.json(); } catch { data = null; }
    }
    if (!res.ok) {
      throw {
        status: res.status,
        code: (data && data.error) || (res.status === 429 ? 'rate_limited' : 'unknown'),
        data,
      };
    }
    return data;
  }

  // ─────────────────────────────────────────────────────────────
  // Chat turn rendering
  // ─────────────────────────────────────────────────────────────
  let busy = false;
  let pendingThinkingTimer = null;
  let pendingStreamTimer = null;
  let activeAyatCard = null;
  let activeAiNode = null;
  let activeResponseSlot = null;

  function setBusy(state) {
    busy = state;
    input.disabled = state;
    inputWrapper.classList.toggle('busy', state);
    skipBtn.disabled = !state || !pendingThinkingTimer;
  }

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

  function streamResponse(text, target, doneCb) {
    target.classList.add('visible');
    const words = text.split(/(\s+)/); // keep whitespace tokens
    let i = 0;
    const caret = document.createElement('span');
    caret.className = 'caret';
    target.appendChild(caret);

    const tick = () => {
      if (i >= words.length) {
        caret.remove();
        pendingStreamTimer = null;
        doneCb && doneCb();
        return;
      }
      const node = document.createTextNode(words[i]);
      target.insertBefore(node, caret);
      i++;
      scrollChatToBottom();
      const delay = /^\s+$/.test(words[i - 1]) ? 0 : 30;
      pendingStreamTimer = setTimeout(tick, delay);
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
    activeAiNode = ai;
    setTimeout(() => {
      streamResponse(aiText || PLACEHOLDER_RESPONSE, ai, () => {
        activeAiNode = null;
        setBusy(false);
        input.focus();
      });
    }, 350);
  }

  // Animated turn (post-send). `aiText` is the server-returned placeholder.
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
    pendingThinkingTimer = setTimeout(() => {
      pendingThinkingTimer = null;
      skipBtn.disabled = true;
      beginAnswer(responseSlot, aiText);
    }, thinkingMs);
    skipBtn.disabled = false;
  }

  // Static render of a historical turn (no animation, no ayat).
  function renderHistoricalTurn(userText, aiText) {
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

  function clearChatArea() {
    chatArea.innerHTML = '';
    activeAyatCard = null;
    activeAiNode = null;
    activeResponseSlot = null;
    if (pendingThinkingTimer) { clearTimeout(pendingThinkingTimer); pendingThinkingTimer = null; }
    if (pendingStreamTimer)   { clearTimeout(pendingStreamTimer);   pendingStreamTimer = null; }
    skipBtn.disabled = true;
  }

  // ─────────────────────────────────────────────────────────────
  // Send / anonymous gate
  // ─────────────────────────────────────────────────────────────
  async function send(text) {
    if (busy || !text.trim()) return;

    // GitHub Pages-демо без бэкенда: проигрываем локальный placeholder, никакой регистрации/истории.
    if (appState.staticMode) {
      setBusy(true);
      runTurnAnimation(text, PLACEHOLDER_RESPONSE);
      return;
    }

    // Anon — intercept and gate behind auth modal.
    if (!appState.user) {
      try { localStorage.setItem(PENDING_KEY, text); } catch {}
      openAuthModal('register', GREETING_TEXT);
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
        try { localStorage.setItem(PENDING_KEY, text); } catch {}
        openAuthModal('login', 'Сессия истекла. Войдите снова, чтобы получить ответ.');
      } else {
        showFloatingError(err.code === 'network' ? 'Нет соединения' : 'Не удалось отправить');
        input.value = text;
        inputWrapper.classList.toggle('has-text', text.length > 0);
        autoresize();
      }
      return;
    }

    appState.currentChatId = resp.chatId;
    runTurnAnimation(resp.userMessage.content, resp.aiMessage.content);
    loadChats().catch(() => {});
  }

  function showFloatingError(msg) {
    // Reuse pending-pill styling for a transient error toast.
    pendingPillText.textContent = msg;
    pendingSendBtn.hidden = true;
    pendingPill.hidden = false;
    setTimeout(() => {
      pendingPill.hidden = true;
      pendingSendBtn.hidden = false;
      pendingPillText.textContent = 'У вас остался незаданный вопрос';
    }, 3000);
  }

  // Skip thinking (dev)
  skipBtn.addEventListener('click', () => {
    if (!pendingThinkingTimer) return;
    clearTimeout(pendingThinkingTimer);
    pendingThinkingTimer = null;
    skipBtn.disabled = true;
    if (activeResponseSlot) {
      // Use the last received AI text by reading from the next-coming render path is awkward;
      // we cached it on the slot for skip continuation.
      const aiText = activeResponseSlot.dataset.aiText || PLACEHOLDER_RESPONSE;
      beginAnswer(activeResponseSlot, aiText);
    }
  });

  function clearInput() {
    input.value = '';
    autoresize();
    inputWrapper.classList.remove('has-text');
  }

  // Cmd/Ctrl + Enter sends; plain Enter inserts a newline (default textarea behavior).
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const value = input.value;
      if (!value.trim() || busy) return;
      // For anon-gate, leave the text in the textarea — modal is an overlay,
      // and the user should still see what they were asking about.
      if (appState.user || appState.staticMode) clearInput();
      send(value);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Drawer
  // ─────────────────────────────────────────────────────────────
  function openDrawer() {
    drawerEl.classList.add('open');
    drawerBackdrop.classList.add('open');
  }
  function closeDrawer() {
    drawerEl.classList.remove('open');
    drawerBackdrop.classList.remove('open');
  }
  drawerToggle.addEventListener('click', () => {
    if (drawerEl.classList.contains('open')) closeDrawer(); else openDrawer();
  });
  drawerBackdrop.addEventListener('click', closeDrawer);

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

  function renderDrawerFooter() {
    if (appState.user) {
      drawerFooter.hidden = false;
      drawerUserLogin.textContent = appState.user.login;
    } else {
      drawerFooter.hidden = true;
    }
  }

  newChatBtn.addEventListener('click', () => {
    if (!appState.user) {
      openAuthModal('register');
      return;
    }
    newChat();
  });

  drawerLogoutBtn.addEventListener('click', async () => {
    try { await api('POST', '/api/auth/logout'); } catch {}
    appState.user = null;
    appState.chats = [];
    appState.currentChatId = null;
    clearChatArea();
    renderDrawerList();
    renderDrawerFooter();
    closeDrawer();
  });

  // ─────────────────────────────────────────────────────────────
  // Chat persistence
  // ─────────────────────────────────────────────────────────────
  async function loadChats() {
    if (!appState.user) return;
    try {
      const { chats } = await api('GET', '/api/chats');
      appState.chats = chats;
      renderDrawerList();
    } catch {
      /* silent — drawer just shows empty/last state */
    }
  }

  async function selectChat(id) {
    if (busy) return;
    closeDrawer();
    try {
      const { chat } = await api('GET', `/api/chats/${id}`);
      appState.currentChatId = chat.id;
      clearChatArea();
      const messages = chat.messages;
      // Pair user/assistant messages into turns in document order.
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].role !== 'user') continue;
        const next = messages[i + 1];
        const aiText = next && next.role === 'assistant' ? next.content : '';
        renderHistoricalTurn(messages[i].content, aiText);
        if (next && next.role === 'assistant') i++;
      }
      renderDrawerList();
      chatArea.scrollTop = chatArea.scrollHeight;
    } catch {
      /* silent */
    }
  }

  function newChat() {
    appState.currentChatId = 'new';
    clearChatArea();
    renderDrawerList();
    closeDrawer();
    input.focus();
  }

  // ─────────────────────────────────────────────────────────────
  // Auth modal
  // ─────────────────────────────────────────────────────────────
  let authMode = 'register';

  function openAuthModal(mode, greetingText) {
    authMode = mode || 'register';
    if (greetingText) {
      authGreeting.textContent = greetingText;
      authGreeting.hidden = false;
    } else {
      authGreeting.hidden = true;
    }
    applyAuthMode();
    authError.textContent = '';
    authBackdrop.classList.add('open');
    authModal.classList.add('open');
    setTimeout(() => authLoginInput.focus(), 60);
  }

  function closeAuthModal() {
    authModal.classList.remove('open');
    authBackdrop.classList.remove('open');
  }

  function applyAuthMode() {
    if (authMode === 'register') {
      authTitle.textContent = 'Создание аккаунта';
      authSubmit.textContent = 'Зарегистрироваться';
      authToggleText.textContent = 'Уже есть аккаунт?';
      authToggleBtn.textContent = 'Войти';
      authPasswordInput.setAttribute('autocomplete', 'new-password');
    } else {
      authTitle.textContent = 'Вход';
      authSubmit.textContent = 'Войти';
      authToggleText.textContent = 'Ещё нет аккаунта?';
      authToggleBtn.textContent = 'Зарегистрироваться';
      authPasswordInput.setAttribute('autocomplete', 'current-password');
    }
  }

  authToggleBtn.addEventListener('click', () => {
    authMode = authMode === 'register' ? 'login' : 'register';
    authError.textContent = '';
    applyAuthMode();
  });

  authCloseBtn.addEventListener('click', closeAuthModal);
  authBackdrop.addEventListener('click', closeAuthModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal.classList.contains('open')) closeAuthModal();
    if (e.key === 'Escape' && drawerEl.classList.contains('open')) closeDrawer();
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (authSubmit.disabled) return;
    const login = authLoginInput.value.trim().toLowerCase();
    const password = authPasswordInput.value;
    if (!login || !password) {
      authError.textContent = 'Заполните оба поля';
      return;
    }
    if (password.length < 8) {
      authError.textContent = AUTH_ERROR_MAP.invalid_password;
      return;
    }
    authError.textContent = '';
    authSubmit.disabled = true;
    const original = authSubmit.textContent;
    authSubmit.textContent = '…';

    try {
      const path = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const { user } = await api('POST', path, { login, password });
      appState.user = user;
      closeAuthModal();
      authForm.reset();
      await loadChats();
      renderDrawerFooter();
      const pending = readPending();
      if (pending) {
        clearPending();
        clearInput(); // chat-area покажет вопрос как сообщение, в поле он больше не нужен
        appState.currentChatId = 'new';
        send(pending);
      }
    } catch (err) {
      authError.textContent = AUTH_ERROR_MAP[err.code] || AUTH_ERROR_MAP.unknown;
    } finally {
      authSubmit.disabled = false;
      authSubmit.textContent = original;
    }
  });

  // ─────────────────────────────────────────────────────────────
  // Pending question (anonymous → registered)
  // ─────────────────────────────────────────────────────────────
  function readPending() {
    try { return localStorage.getItem(PENDING_KEY) || null; } catch { return null; }
  }
  function clearPending() {
    try { localStorage.removeItem(PENDING_KEY); } catch {}
  }

  pendingSendBtn.addEventListener('click', () => {
    const text = readPending();
    pendingPill.hidden = true;
    if (text) {
      clearPending();
      send(text);
    }
  });
  pendingDismissBtn.addEventListener('click', () => {
    clearPending();
    pendingPill.hidden = true;
  });

  input.addEventListener('input', () => {
    autoresize();
    inputWrapper.classList.toggle('has-text', input.value.length > 0);
  });

  autoresize();

  // ─────────────────────────────────────────────────────────────
  // Dev panel sliders
  // ─────────────────────────────────────────────────────────────
  const sliderIds = ['r-input-w', 'r-blur-w', 'r-blur-s', 'r-blur-edge', 'r-dark'];

  sliderIds.forEach(id => {
    const saved = localStorage.getItem(id);
    if (saved !== null) document.getElementById(id).value = saved;
  });

  function updateFromSliders(save) {
    const inputW = document.getElementById('r-input-w').value;
    const blurW = document.getElementById('r-blur-w').value;
    const blurS = document.getElementById('r-blur-s').value;
    const blurEdge = document.getElementById('r-blur-edge').value;
    const dark = document.getElementById('r-dark').value;

    document.getElementById('v-input-w').textContent = inputW;
    document.getElementById('v-blur-w').textContent = blurW;
    document.getElementById('v-blur-s').textContent = blurS;
    document.getElementById('v-blur-edge').textContent = blurEdge;
    document.getElementById('v-dark').textContent = (dark / 100).toFixed(2);

    ui.style.width = `min(${inputW}px, calc(100vw - 64px))`;
    blur.style.width = `${blurW}%`;

    const maskGrad = `linear-gradient(to right, black ${blurEdge}%, transparent 100%)`;
    blur.style.maskImage = maskGrad;
    blur.style.webkitMaskImage = maskGrad;

    if (blur.classList.contains('visible')) {
      blur.style.backdropFilter = `blur(${blurS}px)`;
      blur.style.webkitBackdropFilter = `blur(${blurS}px)`;
      const d = dark / 100;
      blur.style.background = `linear-gradient(to right, rgba(0,0,0,${d}), transparent)`;
    }

    if (save) {
      sliderIds.forEach(id => localStorage.setItem(id, document.getElementById(id).value));
    }
  }

  updateFromSliders(false);

  document.querySelectorAll('#dev-panel input[type="range"]').forEach(el => {
    el.addEventListener('input', () => updateFromSliders(true));
  });

  // ─────────────────────────────────────────────────────────────
  // Bootstrap
  // ─────────────────────────────────────────────────────────────
  async function bootstrap() {
    try {
      const { user } = await api('GET', '/api/me');
      appState.user = user;
      renderDrawerFooter();
      await loadChats();

      // Логин восстановлен, но остался незаданный вопрос — мягкая подсказка, не auto-send.
      const pending = readPending();
      if (pending) {
        pendingPillText.textContent = pending.length > 60 ? pending.slice(0, 60).trimEnd() + '…' : pending;
        pendingPill.hidden = false;
      }
    } catch (err) {
      if (err.status === 401) {
        // Аноним — оставляем UI как есть, ждём отправки → откроется auth-модалка.
        return;
      }
      // /api/me не отвечает (404 / network / unknown) → бэка нет (GitHub Pages-демо).
      // Включаем static mode: вопросы летят в локальный placeholder, дровер скрыт.
      appState.staticMode = true;
      drawerToggle.hidden = true;
    }
  }

  bootstrap();
});
