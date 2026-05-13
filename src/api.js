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
  invalid_login:       'Логин: 3–32 символа, латиница, цифры, _ . -',
  invalid_password:    'Пароль должен быть от 8 символов',
  login_taken:         'Этот логин уже занят',
  invalid_credentials: 'Неверный логин или пароль',
  rate_limited:        'Слишком много попыток. Попробуйте позже.',
  network:             'Нет соединения с сервером',
  unknown:             'Что-то пошло не так. Попробуйте ещё раз.',
};
