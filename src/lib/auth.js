const AUTH_KEY = 'excursao.auth';
const USER_KEY = 'excursao.remember.user';

function readStore(store) {
  try {
    const raw = store.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredAuth() {
  return readStore(window.localStorage) || readStore(window.sessionStorage);
}

export function getToken() {
  return getStoredAuth()?.token || '';
}

export function getRememberedUsername() {
  try {
    return window.localStorage.getItem(USER_KEY) || '';
  } catch {
    return '';
  }
}

export function saveAuth(auth, remember) {
  window.localStorage.removeItem(AUTH_KEY);
  window.sessionStorage.removeItem(AUTH_KEY);
  const raw = JSON.stringify({ token: auth.token, username: auth.username, remember: Boolean(remember) });
  if (remember) {
    window.localStorage.setItem(AUTH_KEY, raw);
    window.localStorage.setItem(USER_KEY, auth.username || '');
  } else {
    window.sessionStorage.setItem(AUTH_KEY, raw);
    window.localStorage.removeItem(USER_KEY);
  }
}

export function clearAuth() {
  window.localStorage.removeItem(AUTH_KEY);
  window.sessionStorage.removeItem(AUTH_KEY);
}
