import { api } from './client';
import type { AuthUser } from '../types';
import { setStoredTokens } from '../store/auth-storage';

export const registerRequest = async (payload: {
  email: string;
  password: string;
  fullName: string;
  locale?: string;
}) => {
  const res = await api.post('/auth/register', payload);
  const { accessToken } = res.data.tokens;
  setStoredTokens({ accessToken });
  return res.data;
};

export const loginRequest = async (payload: { email: string; password: string }) => {
  const res = await api.post('/auth/login', payload);
  const { accessToken } = res.data.tokens;
  setStoredTokens({ accessToken });
  return res.data;
};

export const meRequest = async (): Promise<AuthUser> => {
  const res = await api.get('/auth/me');
  return res.data as AuthUser;
};

export const logoutRequest = async () => {
  await api.post('/auth/logout', {});
  setStoredTokens(null);
};
