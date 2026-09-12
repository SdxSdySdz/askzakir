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
  port:               Number(process.env.PORT) || 3000,
  isProd:             process.env.NODE_ENV === 'production',
  appUrl:             process.env.APP_URL || '',
  sessionSecret:      required('SESSION_SECRET'),
  cookieName:         'az_session',
  sessionTtlMs:       30 * 24 * 60 * 60 * 1000, // 30 days
  messageMaxLen:      8000,
  jsonBodyLimit:      '32kb',
  aiEnabled:          Boolean(process.env.AI_API_KEY && process.env.AI_CHAT_ENDPOINT),
  aiApiKey:           process.env.AI_API_KEY || '',
  aiChatEndpoint:     process.env.AI_CHAT_ENDPOINT || '',
  aiModel:            process.env.AI_MODEL || 'gpt-5.4',
  aiReasoningEffort:  process.env.AI_REASONING_EFFORT || 'xhigh',
  aiTimeoutMs:        Number(process.env.AI_TIMEOUT_MS) || 90000,
  googleClientId:     process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
};
