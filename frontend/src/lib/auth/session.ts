import { clearStoredTokens, getAccessToken, getRefreshToken, setStoredTokens, updateStoredAccessToken } from "@/lib/auth/token-storage";

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export function getSessionTokens(): SessionTokens | null {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export function persistSession(tokens: SessionTokens, remember: boolean) {
  setStoredTokens(tokens, remember);
}

export function updateSessionAccessToken(accessToken: string) {
  updateStoredAccessToken(accessToken);
}

export function clearSession() {
  clearStoredTokens();
}

export function getAccessTokenValue() {
  return getAccessToken();
}

export function getRefreshTokenValue() {
  return getRefreshToken();
}
