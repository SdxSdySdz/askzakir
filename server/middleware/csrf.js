// Anti-CSRF: every non-safe /api/* request must carry X-Requested-With: fetch.
// Cross-origin forms can't add custom headers without a CORS preflight, so this is
// a cheap and effective second line on top of SameSite=Lax cookies.
export function csrfGuard(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (req.get('x-requested-with') !== 'fetch') {
    return res.status(403).json({ error: 'csrf' });
  }
  next();
}
