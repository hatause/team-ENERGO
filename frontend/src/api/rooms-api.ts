import { api } from './client';
import type { Auditory, AuditoryJournal, FindRoomQuery, FindRoomResponse } from '../types';

export async function findFreeRooms(query: FindRoomQuery): Promise<FindRoomResponse> {
  const res = await api.post<FindRoomResponse>('/rooms/find-free', query);
  return res.data;
}

export async function loadAuditories(): Promise<Auditory[]> {
  const res = await api.get<Auditory[]>('/rooms/auditories');
  return res.data;
}

export async function loadJournal(audId?: number): Promise<AuditoryJournal[]> {
  const res = await api.get<AuditoryJournal[]>('/rooms/journal', {
    params: audId != null ? { audId } : undefined
  });
  return res.data;
}

export async function roomFinderHealth(): Promise<Record<string, unknown>> {
  const res = await api.get<Record<string, unknown>>('/rooms/health');
  return res.data;
}
