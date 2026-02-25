import { api } from './client';
import type { SubjectListItem } from '../types';

export const loadSubjects = async (params: { semester?: string; teacherExternalId?: string } = {}) => {
  const res = await api.get('/subjects', { params });
  return res.data as {
    source: 'REMOTE_SCHEDULE' | 'CACHE';
    stale: boolean;
    syncedAt: string;
    items: SubjectListItem[];
    reason?: string;
  };
};
