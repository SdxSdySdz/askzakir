import { db } from '../db/client.js';
import { getBillingForUser, grantSubscription } from '../server/services/billing.js';

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function fail(message) {
  console.error(message);
  console.error('Usage: npm run billing:grant -- --user-id 123 --plan extra --period annual --months 12');
  process.exit(1);
}

const userId = Number(readArg('--user-id'));
const planCode = readArg('--plan');
const billingPeriod = readArg('--period') || 'manual';
const months = Number(readArg('--months') || (billingPeriod === 'annual' ? 12 : 1));

if (!Number.isInteger(userId) || userId <= 0) fail('Invalid --user-id');
if (!planCode) fail('Missing --plan');
if (!Number.isInteger(months) || months < 1) fail('Invalid --months');

try {
  const subscription = grantSubscription({ userId, planCode, billingPeriod, months });
  const billing = getBillingForUser(userId);
  console.log(JSON.stringify({ subscription, billing }, null, 2));
} catch (err) {
  fail(err?.code || err?.message || 'Failed to grant subscription');
} finally {
  db.close();
}
