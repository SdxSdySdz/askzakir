// Управление видео-фоном: intro → loop, появление UI через 4с, осторожный анмьют по клику.
const intro = document.getElementById('video-intro');
const loop  = document.getElementById('video-loop');
const ui    = document.getElementById('ui-container');
const blur  = document.getElementById('blur-overlay');

let shown   = false;
let unmuted = false;
let started = false;
let session = 0;
let primedForSound = false;

function isLandingMode() {
  return document.body.classList.contains('landing-mode');
}

export function showUI() {
  if (isLandingMode()) return;
  if (!started) return;
  if (shown) return;
  shown = true;
  blur.classList.add('visible');
  ui.classList.add('visible');
}

// Снимаем mute. Yandex Browser иногда отказывает на «несвежий» клик и паузит видео —
// делаем explicit pause→muted=false→play() цикл внутри user-gesture; если всё равно
// отбили (или async-pause) — возвращаемся к muted, но без чёрного экрана.
export function tryUnmute() {
  if (isLandingMode()) return;
  if (!started) return;
  if (unmuted) return;
  unmuted = true;
  const activeSession = session;

  function explicitUnmute(el) {
    if (el.ended) return;
    const t = el.currentTime;
    el.pause();
    el.muted = false;
    el.currentTime = t;
    el.play().catch(() => {
      if (!started || activeSession !== session || isLandingMode()) return;
      el.muted = true;
      el.play().catch(() => {});
    });
    setTimeout(() => {
      if (!started || activeSession !== session || isLandingMode()) return;
      if (el.paused && !el.ended) {
        el.muted = true;
        el.play().catch(() => {});
      }
    }, 250);
  }

  explicitUnmute(intro);
  if (loop.classList.contains('active')) explicitUnmute(loop);
}

function makeAudible() {
  intro.muted = false;
  loop.muted = false;
  intro.volume = 1;
  loop.volume = 1;
  unmuted = true;
}

function makeMuted() {
  intro.muted = true;
  loop.muted = true;
  intro.volume = 1;
  loop.volume = 1;
  unmuted = false;
}

function scheduleFallbackReveal(activeSession) {
  setTimeout(() => {
    if (started && activeSession === session) showUI();
  }, 6000);
}

function playIntroWithFallback(audible, activeSession) {
  intro.play().catch(() => {
    if (!started || activeSession !== session || isLandingMode()) return;
    if (!audible) return;
    makeMuted();
    intro.play().catch(() => {});
  });
}

export function primeVideoAudio() {
  if (started) return;
  started = true;
  const activeSession = ++session;
  shown = false;
  primedForSound = true;
  blur.classList.remove('visible');
  ui.classList.remove('visible');
  loop.classList.remove('active');
  intro.muted = false;
  loop.muted = false;
  intro.volume = 0;
  loop.volume = 0;
  try { intro.currentTime = 0; } catch {}
  try { loop.currentTime = 0; } catch {}
  loop.pause();
  intro.play().catch(() => {
    if (!started || activeSession !== session) return;
    primedForSound = false;
    makeMuted();
    intro.play().catch(() => {});
  });
}

export function startVideo({ preferSound = false } = {}) {
  if (started) {
    const activeSession = session;
    if (primedForSound) {
      primedForSound = false;
      loop.classList.remove('active');
      loop.pause();
      try { intro.currentTime = 0; } catch {}
      try { loop.currentTime = 0; } catch {}
    }
    if (preferSound) makeAudible();
    if (intro.paused) playIntroWithFallback(preferSound, activeSession);
    scheduleFallbackReveal(activeSession);
    return;
  }

  started = true;
  const activeSession = ++session;
  shown = false;
  primedForSound = false;
  blur.classList.remove('visible');
  ui.classList.remove('visible');
  loop.classList.remove('active');
  if (preferSound) makeAudible(); else makeMuted();
  try { intro.currentTime = 0; } catch {}
  try { loop.currentTime = 0; } catch {}
  loop.pause();
  playIntroWithFallback(preferSound, activeSession);
  // Фолбэк, если событие `playing` не пришло.
  scheduleFallbackReveal(activeSession);
}

export function stopVideo() {
  session += 1;
  started = false;
  shown = false;
  unmuted = false;
  primedForSound = false;
  intro.pause();
  loop.pause();
  makeMuted();
  loop.classList.remove('active');
  blur.classList.remove('visible');
  ui.classList.remove('visible');
  try { intro.currentTime = 0; } catch {}
  try { loop.currentTime = 0; } catch {}
  setTimeout(() => {
    if (started || !isLandingMode()) return;
    intro.pause();
    loop.pause();
    intro.muted = true;
    loop.muted = true;
    try { intro.currentTime = 0; } catch {}
    try { loop.currentTime = 0; } catch {}
  }, 0);
}

export function initVideo() {
  intro.pause();
  loop.pause();
  try { intro.currentTime = 0; } catch {}
  try { loop.currentTime = 0; } catch {}

  const revealOnVideoFailure = () => {
    showUI();
  };

  intro.addEventListener('ended', () => {
    if (!started || isLandingMode()) return;
    loop.classList.add('active');
    loop.play();
  });

  intro.addEventListener('playing', () => {
    const activeSession = session;
    setTimeout(() => {
      if (started && activeSession === session) showUI();
    }, 4000);
  });

  intro.addEventListener('error', revealOnVideoFailure);
  loop.addEventListener('error', revealOnVideoFailure);
}
