// Frontend Sentry. DSN передаётся через мета-тег <meta name="sentry-dsn" content="...">,
// который сервер может рендерить из env. В Phase 0 — wire-up без DSN: модуль no-op,
// если DSN не задан. В Phase 3, когда деплой будет инжектить мету, ошибки полетят.
//
// CDN-загрузка SDK динамически — чтобы статик-демо на GH Pages не получило лишних 60kb,
// если DSN не выставлен.

let sentryReady = false;

export async function initFrontendSentry() {
  const dsnMeta = document.querySelector('meta[name="sentry-dsn"]');
  const dsn = dsnMeta?.content;
  if (!dsn) return;

  try {
    const Sentry = await import('https://browser.sentry-cdn.com/10.0.0/bundle.es.min.js')
      .catch(() => null);
    if (!Sentry) return;
    Sentry.init({
      dsn,
      environment: location.hostname === 'askzakir.ru' ? 'production' : 'development',
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
    });
    sentryReady = true;
  } catch {
    /* silent — observability never breaks UX */
  }
}

export function reportFrontendError(err, ctx) {
  if (!sentryReady) return;
  // глобальный Sentry будет доступен после init (через window).
  if (window.Sentry) window.Sentry.captureException(err, { extra: ctx });
}
