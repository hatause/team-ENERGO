import axios from 'axios';
import { getStoredTokens, setStoredTokens } from '../store/auth-storage';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  withCredentials: true
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const tokens = getStoredTokens();

  try {
    const res = await axios.post(
      `${api.defaults.baseURL}/auth/refresh`,
      tokens?.refreshToken ? { refreshToken: tokens.refreshToken } : {},
      { withCredentials: true }
    );
    const next = {
      accessToken: res.data.accessToken
    };
    setStoredTokens(next);
    return next.accessToken;
  } catch {
    setStoredTokens(null);
    return null;
  }
};

api.interceptors.request.use((config) => {
  const tokens = getStoredTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { __isRetryRequest?: boolean }) | undefined;

    if (!error.response || error.response.status !== 401 || originalRequest?.__isRetryRequest) {
      throw error;
    }

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    const accessToken = await refreshPromise;
    if (!accessToken) {
      throw error;
    }

    if (!originalRequest) {
      throw error;
    }

    originalRequest.__isRetryRequest = true;
    if (!originalRequest.headers) {
      originalRequest.headers = {};
    }
    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
    return api.request(originalRequest);
  }
);
