import { appState } from './state.js';
import { api } from './api.js';

const billingBar = document.getElementById('billing-bar');
const billingStatus = document.getElementById('billing-status');
const billingStatusText = document.getElementById('billing-status-text');
const billingOpen = document.getElementById('billing-open');
const drawerPlan = document.getElementById('drawer-plan');
const drawerPlanText = document.getElementById('drawer-plan-text');

const pricingBackdrop = document.getElementById('pricing-backdrop');
const pricingModal = document.getElementById('pricing-modal');
const pricingClose = document.getElementById('pricing-close');
const pricingCaption = document.getElementById('pricing-caption');
const pricingGrid = document.getElementById('pricing-grid');
const pricingToggleButtons = Array.from(document.querySelectorAll('[data-billing-cycle]'));
const pricingRequestForm = document.getElementById('pricing-request-form');
const pricingRequestTitle = document.getElementById('pricing-request-title');
const pricingContact = document.getElementById('pricing-contact');
const pricingRequestStatus = document.getElementById('pricing-request-status');

let billingCycle = 'annual';
let requestedPlanCode = null;

function rub(value) {
  return `${Number(value || 0).toLocaleString('ru-RU')} ₽`;
}

function statusText(billing) {
  if (!billing?.plan) return '';
  return `${billing.plan.name} · осталось ${billing.remaining}/${billing.limit}`;
}

function currentPlanCode() {
  return appState.billing?.plan?.code || 'free';
}

function renderStatus() {
  const billing = appState.billing;
  const visible = Boolean(appState.user && billing);
  billingBar.hidden = !visible;
  drawerPlan.hidden = !visible;
  if (!visible) return;

  const text = statusText(billing);
  billingStatusText.textContent = text;
  drawerPlanText.textContent = text;
  billingBar.classList.toggle('depleted', billing.remaining <= 0);
  drawerPlan.classList.toggle('depleted', billing.remaining <= 0);
}

function planPrice(plan) {
  if (plan.code === 'free') {
    return { main: '0 ₽', note: 'без оплаты', old: '' };
  }
  if (billingCycle === 'annual') {
    return {
      main: `${rub(plan.annualMonthlyPriceRub)}/мес`,
      note: `${rub(plan.annualPriceRub)} в год`,
      old: `${rub(plan.monthlyPriceRub)}/мес`,
    };
  }
  return {
    main: `${rub(plan.monthlyPriceRub)}/мес`,
    note: 'помесячно',
    old: '',
  };
}

function planFit(plan) {
  if (plan.code === 'free') return 'Познакомиться';
  if (plan.code === 'plus') return 'Редкие вопросы';
  if (plan.code === 'extra') return 'Регулярно';
  return 'Семья и активное общение';
}

function planValue(plan) {
  if (plan.code === 'free') return '1 пробный вопрос';
  if (plan.code === 'plus') return 'Базовый доступ';
  if (plan.code === 'extra') return 'В 10 раз больше Ильма';
  return 'Самый большой лимит';
}

function showRequestForm(plan) {
  requestedPlanCode = plan.code;
  pricingRequestTitle.textContent = `Заявка на тариф «${plan.name}»`;
  pricingRequestStatus.textContent = '';
  pricingRequestForm.hidden = false;
  pricingContact.focus();
}

function renderPricingCards() {
  const billing = appState.billing;
  const plans = billing?.plans || [];
  pricingGrid.innerHTML = '';

  for (const plan of plans) {
    const isCurrent = plan.code === currentPlanCode();
    const price = planPrice(plan);
    const card = document.createElement('article');
    card.className = 'pricing-card';
    if (plan.popular) card.classList.add('popular');
    if (isCurrent) card.classList.add('current');

    const marker = isCurrent
      ? '<div class="pricing-current">Текущий тариф</div>'
      : (plan.popular ? '<div class="pricing-badge">Лучший выбор</div>' : '<div class="pricing-marker-empty"></div>');
    const buttonText = isCurrent ? 'Текущий тариф' : (plan.code === 'free' ? 'Бесплатный' : 'Оставить заявку');

    card.innerHTML = `
      ${marker}
      <div class="pricing-card-name">${plan.name}</div>
      <div class="pricing-card-price">
        <span>${price.main}</span>
        ${price.old ? `<span class="pricing-price-old">${price.old}</span>` : ''}
      </div>
      <div class="pricing-card-note">${price.note}</div>
      <div class="pricing-limit-hero">
        <strong>${plan.messagesPerMonth}</strong>
        <span>сообщений в месяц</span>
      </div>
      <div class="pricing-compare">
        <div class="pricing-row">
          <span>Для кого</span>
          <strong>${planFit(plan)}</strong>
        </div>
        <div class="pricing-row">
          <span>Смысл</span>
          <strong>${planValue(plan)}</strong>
        </div>
      </div>
      <button type="button" class="pricing-card-action" ${isCurrent || plan.code === 'free' ? 'disabled' : ''}>
        ${buttonText}
      </button>
    `;

    const action = card.querySelector('.pricing-card-action');
    action.addEventListener('click', () => showRequestForm(plan));
    pricingGrid.appendChild(card);
  }
}

function setBillingCycle(nextCycle) {
  billingCycle = nextCycle === 'annual' ? 'annual' : 'monthly';
  for (const button of pricingToggleButtons) {
    button.classList.toggle('active', button.dataset.billingCycle === billingCycle);
  }
  pricingRequestForm.hidden = true;
  pricingRequestStatus.textContent = '';
  renderPricingCards();
}

export function setBilling(billing) {
  appState.billing = billing || null;
  renderStatus();
  if (pricingModal.classList.contains('open')) renderPricingCards();
}

export async function loadBilling() {
  if (!appState.user || appState.staticMode) return null;
  const { billing } = await api('GET', '/api/billing');
  setBilling(billing);
  return billing;
}

export function openPricingModal(options = {}) {
  if (!appState.user) return;
  pricingCaption.textContent = options.exhausted
    ? 'Бесплатный вопрос за этот месяц уже использован. Выберите подходящий лимит.'
    : 'Годовая оплата включена по умолчанию. Лимиты указаны на месяц.';
  pricingRequestForm.hidden = true;
  pricingRequestStatus.textContent = '';
  renderPricingCards();
  pricingBackdrop.classList.add('open');
  pricingModal.classList.add('open');
}

function closePricingModal() {
  pricingBackdrop.classList.remove('open');
  pricingModal.classList.remove('open');
}

async function submitPlanRequest(e) {
  e.preventDefault();
  if (!requestedPlanCode) return;

  const contact = pricingContact.value.trim();
  pricingRequestStatus.textContent = '';
  pricingRequestForm.classList.add('busy');
  try {
    await api('POST', '/api/billing/requests', {
      planCode: requestedPlanCode,
      billingPeriod: billingCycle,
      contact,
    });
    pricingRequestStatus.textContent = 'Заявка отправлена';
    pricingContact.value = '';
  } catch (err) {
    pricingRequestStatus.textContent =
      err.code === 'invalid_contact' ? 'Укажите Telegram или email' : 'Не удалось отправить заявку';
  } finally {
    pricingRequestForm.classList.remove('busy');
  }
}

export function initBilling() {
  setBillingCycle('annual');
  billingStatus.addEventListener('click', () => openPricingModal());
  billingOpen.addEventListener('click', () => openPricingModal());
  drawerPlan.addEventListener('click', () => openPricingModal());
  pricingClose.addEventListener('click', closePricingModal);
  pricingBackdrop.addEventListener('click', closePricingModal);
  pricingRequestForm.addEventListener('submit', submitPlanRequest);

  for (const button of pricingToggleButtons) {
    button.addEventListener('click', () => setBillingCycle(button.dataset.billingCycle));
  }

  document.addEventListener('billing:update', (e) => setBilling(e.detail?.billing));
  document.addEventListener('billing:quota-exceeded', (e) => {
    if (e.detail?.billing) setBilling(e.detail.billing);
    openPricingModal({ exhausted: true });
  });
  document.addEventListener('auth:logout', () => setBilling(null));
}
