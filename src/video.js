// Управление видео-фоном: intro → loop, появление UI через 4с, осторожный анмьют по клику.
const intro = document.getElementById('video-intro');
const loop  = document.getElementById('video-loop');
const ui    = document.getElementById('ui-container');
const blur  = document.getElementById('blur-overlay');

let shown   = false;
let unmuted = false;

export function showUI() {
  if (shown) return;
  shown = true;
  blur.classList.add('visible');
  ui.classList.add('visible');
}

// Снимаем mute. Yandex Browser иногда отказывает на «несвежий» клик и паузит видео —
// делаем explicit pause→muted=false→play() цикл внутри user-gesture; если всё равно
// отбили (или async-pause) — возвращаемся к muted, но без чёрного экрана.
export function tryUnmute() {
  if (unmuted) return;
  unmuted = true;

  function explicitUnmute(el) {
    if (el.ended) return;
    const t = el.currentTime;
    el.pause();
    el.muted = false;
    el.currentTime = t;
    el.play().catch(() => {
      el.muted = true;
      el.play().catch(() => {});
    });
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

export function initVideo() {
  intro.addEventListener('ended', () => {
    loop.classList.add('active');
    loop.play();
  });

  intro.addEventListener('playing', () => {
    setTimeout(showUI, 4000);
  });

  intro.play().catch(() => {});
  // Фолбэк, если событие `playing` не пришло.
  setTimeout(showUI, 6000);
}
