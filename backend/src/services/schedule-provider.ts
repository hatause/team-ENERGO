import net from 'node:net';
import { env } from '../config/env.js';

export type ScheduleQuery = {
  groupCode?: string;
  semester?: string;
  teacherExternalId?: string;
};

export type RemoteScheduleItem = {
  externalScheduleId: string;
  externalSubjectCode: string;
  subjectName: string;
  groupCode: string;
  semester?: string;
  teacherExternalId?: string;
  teacherName?: string;
  startsAt: string;
  endsAt: string;
  room?: string;
};

const isRemoteScheduleItem = (value: unknown): value is RemoteScheduleItem => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.externalScheduleId === 'string' &&
    typeof obj.externalSubjectCode === 'string' &&
    typeof obj.subjectName === 'string' &&
    typeof obj.groupCode === 'string' &&
    typeof obj.startsAt === 'string' &&
    typeof obj.endsAt === 'string'
  );
};

const normalizeResponse = (payload: unknown): RemoteScheduleItem[] => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const items = (payload as { items?: unknown[] }).items ?? [];
  return items.filter(isRemoteScheduleItem);
};

type JavaSubjectItem = {
  id?: string | number;
  subName?: string;
  teacherName?: string;
};

const toSafeCode = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized.slice(0, 64) : 'subject';
};

const normalizeSubjectsPayload = (payload: unknown): JavaSubjectItem[] => {
  if (Array.isArray(payload)) {
    return payload as JavaSubjectItem[];
  }
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const obj = payload as { subjects?: unknown[]; items?: unknown[] };
  if (Array.isArray(obj.subjects)) {
    return obj.subjects as JavaSubjectItem[];
  }
  if (Array.isArray(obj.items)) {
    return obj.items as JavaSubjectItem[];
  }
  return [];
};

const mapSubjectsToScheduleItems = (payload: unknown, query: ScheduleQuery): RemoteScheduleItem[] => {
  const subjects = normalizeSubjectsPayload(payload);
  const now = Date.now();
  const teacherFilter = query.teacherExternalId?.trim().toLowerCase();

  return subjects
    .map((row, index) => {
      const subjectName = typeof row.subName === 'string' ? row.subName.trim() : '';
      if (!subjectName) {
        return null;
      }
      const teacherName = typeof row.teacherName === 'string' ? row.teacherName.trim() : undefined;
      if (teacherFilter && (!teacherName || !teacherName.toLowerCase().includes(teacherFilter))) {
        return null;
      }
      const idPart =
        row.id !== undefined && row.id !== null
          ? String(row.id)
          : toSafeCode(subjectName);
      const starts = new Date(now + index * 60_000);
      const ends = new Date(starts.getTime() + 90 * 60_000);
      return {
        externalScheduleId: `subject_${idPart}`,
        externalSubjectCode: `subject_${idPart}`,
        subjectName,
        groupCode: query.groupCode ?? 'GLOBAL',
        semester: query.semester,
        teacherExternalId: teacherName,
        teacherName,
        startsAt: starts.toISOString(),
        endsAt: ends.toISOString()
      } as RemoteScheduleItem;
    })
    .filter((item): item is RemoteScheduleItem => item !== null);
};

const parseErrorText = (raw: string): string => {
  let details = raw;
  try {
    const parsed = JSON.parse(raw) as { message?: string; error?: string };
    details = parsed.message ?? parsed.error ?? raw;
  } catch {
    details = raw;
  }
  return details.trim();
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatFetchFailure = (url: string, error: unknown): string => {
  if (!(error instanceof Error)) {
    return `fetch failed: ${url}`;
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause && typeof cause === 'object') {
    const causeObj = cause as { code?: string; message?: string; errno?: number };
    const code = causeObj.code ? ` ${causeObj.code}` : '';
    const errno = typeof causeObj.errno === 'number' ? ` errno=${causeObj.errno}` : '';
    const message = causeObj.message ? ` ${causeObj.message}` : '';
    return `fetch failed: ${url}${code}${errno}${message}`.trim();
  }

  return `fetch failed: ${url} ${error.message}`.trim();
};

const fetchJsonHttp = async (url: string, init: RequestInit): Promise<unknown> => {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.SCHEDULE_PROVIDER_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const raw = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP schedule provider failed: ${res.status} ${parseErrorText(raw)}`.trim());
      }
      if (!raw.trim()) {
        return [];
      }
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        throw new Error(`HTTP schedule provider returned non-JSON response: ${url}`);
      }
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw new Error(formatFetchFailure(url, error));
      }
      await sleep(250);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`fetch failed: ${url}`);
};

const fetchViaHttp = async (query: ScheduleQuery): Promise<RemoteScheduleItem[]> => {
  if (!env.SCHEDULE_PROVIDER_HTTP_URL) {
    throw new Error('SCHEDULE_PROVIDER_HTTP_URL is not configured');
  }

  const baseUrl = env.SCHEDULE_PROVIDER_HTTP_URL.replace(/\/+$/, '');
  const subjectsUrl = baseUrl.endsWith('/subjects') ? baseUrl : `${baseUrl}/subjects`;
  const errors: string[] = [];

  // 1) If URL points directly to /subjects, prefer GET.
  if (baseUrl.endsWith('/subjects')) {
    try {
      const payload = await fetchJsonHttp(subjectsUrl, {
        method: 'GET',
        headers: { accept: 'application/json' }
      });
      return mapSubjectsToScheduleItems(payload, query);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown HTTP error');
    }
  } else {
    // 2) Generic provider mode: POST query payload and try parse items or subject-like payload.
    try {
      const payload = await fetchJsonHttp(baseUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(query)
      });
      const scheduleItems = normalizeResponse(payload);
      if (scheduleItems.length > 0) {
        return scheduleItems;
      }
      const mappedSubjects = mapSubjectsToScheduleItems(payload, query);
      if (mappedSubjects.length > 0) {
        return mappedSubjects;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown HTTP error');
    }
  }

  // 3) Spring fallback for this Java server: GET /api/schedule/subjects
  try {
    const payload = await fetchJsonHttp(subjectsUrl, {
      method: 'GET',
      headers: { accept: 'application/json' }
    });
    const mapped = mapSubjectsToScheduleItems(payload, query);
    if (mapped.length > 0) {
      return mapped;
    }
    return [];
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown HTTP error');
  }

  throw new Error(errors.join(' | '));
};

const fetchViaTcp = async (query: ScheduleQuery): Promise<RemoteScheduleItem[]> => {
  if (!env.SCHEDULE_PROVIDER_TCP_HOST || !env.SCHEDULE_PROVIDER_TCP_PORT) {
    throw new Error('SCHEDULE_PROVIDER_TCP_HOST/TCP_PORT are not configured');
  }

  return new Promise<RemoteScheduleItem[]>((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error('TCP schedule provider timeout'));
      }
    }, env.SCHEDULE_PROVIDER_TIMEOUT_MS);

    let buffer = '';

    const finalizeResolve = (items: RemoteScheduleItem[]) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      resolve(items);
    };

    const finalizeReject = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      reject(error);
    };

    const parseLine = (line: string) => {
      try {
        const parsed = JSON.parse(line) as { status?: string; items?: unknown[] };
        if (parsed.status && parsed.status !== 'OK') {
          finalizeReject(new Error(`TCP schedule provider status: ${parsed.status}`));
          return;
        }
        finalizeResolve(normalizeResponse({ items: parsed.items ?? [] }));
      } catch (error) {
        finalizeReject(error);
      }
    };

    const consumeBuffer = (force = false) => {
      if (settled) {
        return;
      }
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        if (line.length > 0) {
          parseLine(line);
          return;
        }
      }

      if (force) {
        const line = buffer.trim();
        if (!line) {
          finalizeResolve([]);
          return;
        }
        parseLine(line);
      }
    };

    socket.connect(env.SCHEDULE_PROVIDER_TCP_PORT, env.SCHEDULE_PROVIDER_TCP_HOST, () => {
      const payload = {
        action: 'GET_SCHEDULE',
        requestId: `req_${Date.now()}`,
        ...query
      };
      socket.write(`${JSON.stringify(payload)}\n`);
      socket.end();
    });

    socket.on('data', (data) => {
      buffer += data.toString('utf8');
      consumeBuffer(false);
    });

    socket.on('end', () => {
      consumeBuffer(true);
    });

    socket.on('error', (error) => {
      finalizeReject(error);
    });

    socket.on('close', () => {
      clearTimeout(timeout);
    });
  });
};

export const fetchRemoteSchedule = async (query: ScheduleQuery): Promise<RemoteScheduleItem[]> => {
  if (env.SCHEDULE_PROVIDER_MODE === 'tcp') {
    return fetchViaTcp(query);
  }
  return fetchViaHttp(query);
};
