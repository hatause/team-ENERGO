export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

const TOKEN_KEY = 'visualsite_tokens';

export const getStoredTokens = (): AuthTokens | null => {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
};

export const setStoredTokens = (tokens: AuthTokens | null) => {
  if (!tokens) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
};
