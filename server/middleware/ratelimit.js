import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';
const passThrough = (_req, _res, next) => next();

// Throttle provider sign-ins: 10 attempts per hour per IP.
export const providerAuthLimiter = isTest ? passThrough : rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
