import { env } from '../config/env.js';

/* ───── Types matching Java DTOs ───── */

export interface RoomInfo {
  name: string;
  location_name?: string;
  location_id?: string;
  floor?: number;
  capacity?: number;
  schedule_free?: boolean;
  camera_free?: boolean;
  camera_status?: string;
  auditory_id?: number;
}

export interface FindRoomRequest {
  location_id: string;
  start_at: string;           // ISO-8601
  duration_minutes: number;
  floor?: number;
  filters?: {
    min_capacity?: number;
    need_projector?: boolean;
  };
  requested_by?: { telegram_user_id?: number; user_id?: string };
}

export interface FindRoomResponse {
  free_rooms: RoomInfo[];
  alternatives: RoomInfo[];
  reason: string;
}

export interface Auditory {
  id: number;
  name: string;
  number: string;
  corpus: string;
  category: string;
}

export interface AuditoryJournal {
  id: number;
  audId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  duration: number;
  timeStatus: string;
}

/* ───── HTTP helpers ───── */

const baseUrl = (): string => {
  const url = env.ROOM_FINDER_JAVA_URL;
  if (!url) throw new Error('ROOM_FINDER_JAVA_URL is not configured');
  return url.replace(/\/+$/, '');
};

const headers = (): Record<string, string> => {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
  if (env.ROOM_FINDER_API_KEY) {
    h['X-API-Key'] = env.ROOM_FINDER_API_KEY;
  }
  return h;
};

async function javaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${baseUrl()}${path}`;

  console.log(`[room-finder] → ${init?.method ?? 'GET'} ${url}`);

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...headers(), ...(init?.headers as Record<string, string> ?? {}) },
      signal: AbortSignal.timeout(8_000)
    });
  } catch (err: any) {
    console.error(`[room-finder] Network error reaching ${url}:`, err.message);
    throw new Error(`Cannot reach Java server at ${url}: ${err.message}`);
  }

  console.log(`[room-finder] ← ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`[room-finder] Error body:`, text);
    throw new Error(`Java API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/* ───── Public API ───── */

/** Health-check of Java server */
export async function roomFinderHealth() {
  return javaFetch<Record<string, unknown>>('/api/bridge');
}

/** POST /api/bridge  — find free rooms via YOLO + schedule */
export async function findFreeRooms(req: FindRoomRequest): Promise<FindRoomResponse> {
  return javaFetch<FindRoomResponse>('/api/bridge', {
    method: 'POST',
    body: JSON.stringify(req)
  });
}

/** GET /api/schedule/auditories — list of all rooms */
export async function getAuditories(): Promise<Auditory[]> {
  return javaFetch<Auditory[]>('/api/schedule/auditories');
}

/** GET /api/schedule/journal — occupancy journal */
export async function getJournal(audId?: number): Promise<AuditoryJournal[]> {
  const path = audId != null ? `/api/schedule/journal/${audId}` : '/api/schedule/journal';
  return javaFetch<AuditoryJournal[]>(path);
}
