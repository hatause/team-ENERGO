import { api } from './client';

export const loadTeacherSummary = async (params: {
  groupCode: string;
  subjectId?: string;
  from?: string;
  to?: string;
}) => {
  const res = await api.get('/teacher/analytics/summary', { params });
  return res.data;
};

export const loadWeakTopics = async (params: { groupCode: string; subjectId?: string }) => {
  const res = await api.get('/teacher/analytics/weak-topics', { params });
  return res.data;
};

export const loadTeacherActivities = async (params: {
  groupCode: string;
  type?: 'FEYNMAN' | 'DEBATE';
  status?: 'PENDING_REVIEW' | 'REVIEWED';
}) => {
  const res = await api.get('/teacher/activities', { params });
  return res.data;
};
