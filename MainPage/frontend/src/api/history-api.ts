import { api } from './client';

export const loadHistory = async (params: { subjectId?: string; page?: number; pageSize?: number }) => {
  const res = await api.get('/history/attempts', { params });
  return res.data;
};

export const loadHistoryDetails = async (attemptId: string) => {
  const res = await api.get(`/history/attempts/${attemptId}`);
  return res.data;
};
