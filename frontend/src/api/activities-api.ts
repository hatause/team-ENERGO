import { api } from './client';

export type ActivityMessage = { role: 'student' | 'ai'; text: string };

export const createActivity = async (payload: {
  type: 'FEYNMAN' | 'DEBATE';
  subjectId: string;
  transcript: ActivityMessage[];
}) => {
  const res = await api.post('/activities', payload);
  return res.data;
};

export const nextActivityTurn = async (payload: {
  type: 'FEYNMAN' | 'DEBATE';
  subjectId: string;
  transcript: ActivityMessage[];
  studentMessage?: string;
}) => {
  const res = await api.post('/activities/next-turn', payload);
  return res.data as {
    type: 'FEYNMAN' | 'DEBATE';
    subjectId: string;
    subjectName: string;
    aiRole?: string;
    aiMessage: string;
    transcript: ActivityMessage[];
  };
};

export const loadActivityHistory = async () => {
  const res = await api.get('/activities/history');
  return res.data as {
    items: {
      sessionId: string;
      type: 'FEYNMAN' | 'DEBATE';
      subjectId: string;
      subjectName: string;
      score?: { total?: number };
      reviewStatus: string;
      createdAt: string;
    }[];
  };
};
