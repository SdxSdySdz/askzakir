import 'dotenv/config';

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`FATAL: ${name} is not set.`);
    console.error('  generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
  return v;
}

// Loaded once at boot; consumed by app.js + services. Single source of config truth.
export const config = {
  port:          Number(process.env.PORT) || 3000,
  isProd:        process.env.NODE_ENV === 'production',
  // Reserved for future signed-cookie / token-tamper-check use; today we use opaque
  // session tokens stored in DB, so this value is only validated at boot.
  sessionSecret: required('SESSION_SECRET'),
  cookieName:    'az_session',
  sessionTtlMs:  30 * 24 * 60 * 60 * 1000, // 30 days
  bcryptCost:    12,
  loginRe:       /^[a-zA-Z0-9_.\-]{3,32}$/,
  passwordMin:   8,
  passwordMaxBytes: 72, // bcrypt truncates at 72 bytes; reject longer
  messageMaxLen: 8000,
  jsonBodyLimit: '32kb',
};
