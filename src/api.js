// Единственная точка fetch-вызовов на бэк. Бросает структурированную ошибку с .status и .code.
export async function api(method, path, body) {
  const opts = {
    method,
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'fetch' },
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(path, opts);
  } catch {
    throw { status: 0, code: 'network' };
  }
  let data = null;
  if (res.status !== 204) {
    try { data = await res.json(); } catch { data = null; }
  }
  if (!res.ok) {
    throw {
      status: res.status,
      code: (data && data.error) || (res.status === 429 ? 'rate_limited' : 'unknown'),
      data,
    };
  }
  return data;
}

export const AUTH_ERROR_MAP = {
  invalid_provider:    'Неизвестный способ входа.',
  invalid_provider_user: 'Не удалось подготовить профиль для входа.',
  rate_limited:        'Слишком много попыток. Попробуйте позже.',
  quota_exceeded:      'Бесплатный вопрос за этот месяц уже использован.',
  network:             'Нет соединения с сервером',
  unknown:             'Что-то пошло не так. Попробуйте ещё раз.',
};
