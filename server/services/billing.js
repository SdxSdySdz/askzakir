import { db, stmts } from '../../db/client.js';

export const PLANS = Object.freeze([
  {
    code: 'free',
    name: 'Ният',
    messagesPerMonth: 1,
    monthlyPriceRub: 0,
    annualMonthlyPriceRub: null,
    annualPriceRub: null,
    popular: false,
  },
  {
    code: 'plus',
    name: 'Ильм',
    messagesPerMonth: 10,
    monthlyPriceRub: 149,
    annualMonthlyPriceRub: 99,
    annualPriceRub: 1188,
    popular: false,
  },
  {
    code: 'extra',
    name: 'Сабр',
    messagesPerMonth: 100,
    monthlyPriceRub: 199,
    annualMonthlyPriceRub: 149,
    annualPriceRub: 1788,
    popular: true,
  },
  {
    code: 'ultra',
    name: 'Хикма',
    messagesPerMonth: 500,
    monthlyPriceRub: 799,
    annualMonthlyPriceRub: 749,
    annualPriceRub: 8988,
    popular: false,
  },
]);

const PLAN_BY_CODE = new Map(PLANS.map((plan) => [plan.code, plan]));
const PAID_PLAN_CODES = new Set(['plus', 'extra', 'ultra']);
const BILLING_PERIODS = new Set(['monthly', 'annual']);
const MOSCOW_TZ = 'Europe/Moscow';

export class BillingError extends Error {
  constructor(code, status = 400, billing = null) {
    super(code);
    this.code = code;
    this.status = status;
    this.billing = billing;
  }
}

export function periodKeyFor(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MOSCOW_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  return `${year}-${month}`;
}

function publicPlan(plan) {
  return {
    code: plan.code,
    name: plan.name,
    messagesPerMonth: plan.messagesPerMonth,
    monthlyPriceRub: plan.monthlyPriceRub,
    annualMonthlyPriceRub: plan.annualMonthlyPriceRub,
    annualPriceRub: plan.annualPriceRub,
    popular: plan.popular,
  };
}

function publicSubscription(subscription) {
  if (!subscription) return null;
  return {
    planCode: subscription.plan_code,
    billingPeriod: subscription.billing_period,
    startsAt: subscription.starts_at,
    endsAt: subscription.ends_at,
  };
}

function activeSubscriptionFor(userId, now) {
  return stmts.getActiveSubscription.get(userId, now, now) || null;
}

function planForSubscription(subscription) {
  if (!subscription) return PLAN_BY_CODE.get('free');
  return PLAN_BY_CODE.get(subscription.plan_code) || PLAN_BY_CODE.get('free');
}

function ensureUsageRow(userId, periodKey, now) {
  stmts.insertUsagePeriod.run(userId, periodKey, now, now);
  return stmts.getUsagePeriod.get(userId, periodKey);
}

function buildBilling(userId, now = Date.now()) {
  const subscription = activeSubscriptionFor(userId, now);
  const plan = planForSubscription(subscription);
  const periodKey = periodKeyFor(now);
  const usage = ensureUsageRow(userId, periodKey, now);
  const used = Number(usage?.used_messages || 0);
  const limit = plan.messagesPerMonth;

  return {
    plan: publicPlan(plan),
    periodKey,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    subscription: publicSubscription(subscription),
    plans: PLANS.map(publicPlan),
  };
}

export function getBillingForUser(userId, now = Date.now()) {
  return buildBilling(userId, now);
}

export function reserveMessage(userId, now = Date.now()) {
  return db.transaction(() => {
    const before = buildBilling(userId, now);
    if (before.remaining <= 0) {
      throw new BillingError('quota_exceeded', 402, before);
    }

    stmts.incrementUsagePeriod.run(now, userId, before.periodKey);
    const billing = buildBilling(userId, now);
    return { userId, periodKey: before.periodKey, billing };
  })();
}

export function releaseMessage(reservation, now = Date.now()) {
  if (!reservation?.userId || !reservation?.periodKey) return null;
  return db.transaction(() => {
    stmts.decrementUsagePeriod.run(now, reservation.userId, reservation.periodKey);
    return buildBilling(reservation.userId, now);
  })();
}

function normalisePlanCode(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

function normaliseBillingPeriod(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

function normaliseContact(raw) {
  return String(raw ?? '').trim().replace(/\s+/g, ' ');
}

export function createPlanRequest(userId, payload) {
  const planCode = normalisePlanCode(payload?.planCode);
  const billingPeriod = normaliseBillingPeriod(payload?.billingPeriod);
  const contact = normaliseContact(payload?.contact);

  if (!PAID_PLAN_CODES.has(planCode)) throw new BillingError('invalid_plan');
  if (!BILLING_PERIODS.has(billingPeriod)) throw new BillingError('invalid_billing_period');
  if (contact.length < 3 || contact.length > 140) throw new BillingError('invalid_contact');

  const now = Date.now();
  const info = stmts.insertPlanRequest.run(userId, planCode, billingPeriod, contact, now);
  return {
    id: info.lastInsertRowid,
    planCode,
    billingPeriod,
    contact,
    status: 'new',
    createdAt: now,
  };
}

export function grantSubscription({ userId, planCode, billingPeriod = 'manual', months = 1, now = Date.now() }) {
  userId = Number(userId);
  planCode = normalisePlanCode(planCode);
  billingPeriod = normaliseBillingPeriod(billingPeriod || 'manual');
  months = Number(months);

  if (!Number.isInteger(userId) || userId <= 0) throw new BillingError('invalid_user');
  if (!PAID_PLAN_CODES.has(planCode)) throw new BillingError('invalid_plan');
  if (!new Set(['monthly', 'annual', 'manual']).has(billingPeriod)) {
    throw new BillingError('invalid_billing_period');
  }
  if (!Number.isInteger(months) || months < 1 || months > 60) throw new BillingError('invalid_months');

  return db.transaction(() => {
    const endsAt = now + months * 31 * 24 * 60 * 60 * 1000;
    stmts.deactivateActiveSubscriptions.run(now, userId, now, now);
    const info = stmts.insertSubscription.run(userId, planCode, billingPeriod, now, endsAt, now);
    return {
      id: info.lastInsertRowid,
      userId,
      planCode,
      billingPeriod,
      startsAt: now,
      endsAt,
    };
  })();
}
