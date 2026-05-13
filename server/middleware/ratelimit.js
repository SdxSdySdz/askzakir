import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';
const passThrough = (_req, _res, next) => next();

// Brute-force defence on login: per (IP+login) pair. Five attempts in 15 minutes.
export const loginLimiter = isTest ? passThrough : rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.login || '').toLowerCase()}`,
});

// Throttle account spam: 3 registrations per hour per IP.
export const registerLimiter = isTest ? passThrough : rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
