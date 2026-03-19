const ACCESS_TOKEN_KEY = "staracc.access-token";
const REFRESH_TOKEN_KEY = "staracc.refresh-token";
const REMEMBER_SESSION_KEY = "staracc.remember-session";

type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

function hasWindow() {
  return typeof window !== "undefined";
}

function getStorage(remember?: boolean) {
  if (!hasWindow()) {
    return null;
  }

  if (remember === true) {
    return window.localStorage;
  }

  if (remember === false) {
    return window.sessionStorage;
  }

  const persisted = window.localStorage.getItem(REMEMBER_SESSION_KEY);
  return persisted === "true" ? window.localStorage : window.sessionStorage;
}

export function hasStoredSession() {
  if (!hasWindow()) {
    return false;
  }

  return Boolean(getAccessToken()) || Boolean(getRefreshToken());
}

export function getRememberSessionPreference() {
  if (!hasWindow()) {
    return true;
  }

  return window.localStorage.getItem(REMEMBER_SESSION_KEY) !== "false";
}

export function setStoredTokens(tokens: StoredTokens, remember: boolean) {
  if (!hasWindow()) {
    return;
  }

  const target = getStorage(remember);
  const other = remember ? window.sessionStorage : window.localStorage;

  other.removeItem(ACCESS_TOKEN_KEY);
  other.removeItem(REFRESH_TOKEN_KEY);

  target?.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  target?.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  window.localStorage.setItem(REMEMBER_SESSION_KEY, String(remember));
}

export function updateStoredAccessToken(accessToken: string) {
  if (!hasWindow()) {
    return;
  }

  getStorage()?.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function getAccessToken() {
  if (!hasWindow()) {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (!hasWindow()) {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearStoredTokens() {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
