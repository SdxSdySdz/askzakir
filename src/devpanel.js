const ui   = document.getElementById('ui-container');
const blur = document.getElementById('blur-overlay');

const sliderIds = ['r-input-w', 'r-blur-w', 'r-blur-s', 'r-blur-edge', 'r-dark'];

function updateFromSliders(save) {
  const inputW   = document.getElementById('r-input-w').value;
  const blurW    = document.getElementById('r-blur-w').value;
  const blurS    = document.getElementById('r-blur-s').value;
  const blurEdge = document.getElementById('r-blur-edge').value;
  const dark     = document.getElementById('r-dark').value;

  document.getElementById('v-input-w').textContent  = inputW;
  document.getElementById('v-blur-w').textContent   = blurW;
  document.getElementById('v-blur-s').textContent   = blurS;
  document.getElementById('v-blur-edge').textContent = blurEdge;
  document.getElementById('v-dark').textContent      = (dark / 100).toFixed(2);

  ui.style.width = `min(${inputW}px, calc(100vw - 64px))`;
  blur.style.width = `${blurW}%`;

  const maskGrad = `linear-gradient(to right, black ${blurEdge}%, transparent 100%)`;
  blur.style.maskImage = maskGrad;
  blur.style.webkitMaskImage = maskGrad;

  if (blur.classList.contains('visible')) {
    blur.style.backdropFilter        = `blur(${blurS}px)`;
    blur.style.webkitBackdropFilter  = `blur(${blurS}px)`;
    const d = dark / 100;
    blur.style.background = `linear-gradient(to right, rgba(0,0,0,${d}), transparent)`;
  }

  if (save) {
    sliderIds.forEach(id => localStorage.setItem(id, document.getElementById(id).value));
  }
}

export function initDevPanel() {
  // На мобиле панель скрыта в CSS, и её inline-styles (особенно blur width:50%)
  // переопределяют mobile media-query → ai-response не читается. Просто скипаем init.
  if (window.matchMedia('(max-width: 768px)').matches) return;

  sliderIds.forEach(id => {
    const saved = localStorage.getItem(id);
    if (saved !== null) document.getElementById(id).value = saved;
  });
  updateFromSliders(false);
  document.querySelectorAll('#dev-panel input[type="range"]').forEach(el => {
    el.addEventListener('input', () => updateFromSliders(true));
  });
}
