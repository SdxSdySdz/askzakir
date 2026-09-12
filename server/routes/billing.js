import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  BillingError,
  createPlanRequest,
  getBillingForUser,
} from '../services/billing.js';

export const billingRouter = Router();

billingRouter.use(requireAuth);

billingRouter.get('/', (req, res) => {
  res.json({ billing: getBillingForUser(req.user.id) });
});

billingRouter.post('/requests', (req, res, next) => {
  try {
    const request = createPlanRequest(req.user.id, req.body);
    res.status(201).json({ request, billing: getBillingForUser(req.user.id) });
  } catch (err) {
    if (err instanceof BillingError) return res.status(err.status).json({ error: err.code });
    next(err);
  }
});
