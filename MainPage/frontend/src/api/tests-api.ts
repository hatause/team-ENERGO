import { api } from './client';
import type { TestDetails } from '../types';

export const generateTest = async (payload: {
  subjectId: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  questionTypes: ('SINGLE_CHOICE' | 'MULTI_CHOICE' | 'OPEN_SHORT')[];
  questionCount: number;
  topicIds: string[];
  language: string;
}) => {
  const res = await api.post('/tests/generate', payload);
  return res.data as { testId: string; status: string; etaSec: number };
};

export const getTest = async (testId: string): Promise<TestDetails> => {
  const res = await api.get(`/tests/${testId}`);
  return res.data as TestDetails;
};

export const submitTest = async (
  testId: string,
  payload: {
    answers: { questionId: string; selectedOptionIds?: string[]; answerText?: string }[];
    clientDurationSec?: number;
  }
) => {
  const res = await api.post(`/tests/${testId}/submit`, payload);
  return res.data as { attemptId: string; status: string };
};

export const getAttemptResult = async (attemptId: string) => {
  const res = await api.get(`/attempts/${attemptId}/result`);
  return res.data;
};

export const getAttemptReview = async (attemptId: string) => {
  const res = await api.get(`/attempts/${attemptId}/review`);
  return res.data;
};
