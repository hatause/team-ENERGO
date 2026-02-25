import net from 'node:net';
import type { FastifyBaseLogger } from 'fastify';
import { prisma } from '../db/prisma.js';

type SubjectPushItem = {
  id?: string | number;
  idSub?: string | number;
  subName?: string;
  teacherName?: string;
  groupCode?: string;
  semester?: string;
};

type PushConfig = {
  port: number;
  defaultGroupCode: string;
  defaultSemester: string;
};

const toSafeCode = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  return normalized.length > 0 ? normalized.slice(0, 64) : 'subject';
};

const parsePayload = (payload: unknown): SubjectPushItem[] => {
  if (Array.isArray(payload)) {
    return payload as SubjectPushItem[];
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const obj = payload as { items?: unknown[]; subjects?: unknown[] };
  if (Array.isArray(obj.items)) {
    return obj.items as SubjectPushItem[];
  }
  if (Array.isArray(obj.subjects)) {
    return obj.subjects as SubjectPushItem[];
  }

  return [];
};

const persistSubjects = async (items: SubjectPushItem[], config: PushConfig) => {
  const now = Date.now();
  let imported = 0;

  for (let index = 0; index < items.length; index += 1) {
    const row = items[index];
    const subjectName = typeof row.subName === 'string' ? row.subName.trim() : '';
    if (!subjectName) {
      continue;
    }

    const groupCode = (typeof row.groupCode === 'string' && row.groupCode.trim()) || config.defaultGroupCode;
    const semester = (typeof row.semester === 'string' && row.semester.trim()) || config.defaultSemester;
    const teacherName = typeof row.teacherName === 'string' ? row.teacherName.trim() : undefined;

    const idPartRaw = row.idSub ?? row.id;
    const idPart = idPartRaw !== undefined && idPartRaw !== null ? String(idPartRaw) : toSafeCode(subjectName);

    const subjectCode = `java_subject_${idPart}`;
    const scheduleId = `java_push_${groupCode}_${idPart}`;

    const startsAt = new Date(now + index * 60_000);
    const endsAt = new Date(startsAt.getTime() + 90 * 60_000);

    const group = await prisma.group.upsert({
      where: { code: groupCode },
      update: {
        semester,
        externalGroupCode: groupCode
      },
      create: {
        code: groupCode,
        name: groupCode,
        semester,
        externalGroupCode: groupCode
      }
    });

    const subject = await prisma.subject.upsert({
      where: { externalSubjectCode: subjectCode },
      update: {
        name: subjectName,
        description: `Imported from Java push TCP (${new Date().toISOString()})`
      },
      create: {
        externalSubjectCode: subjectCode,
        name: subjectName,
        description: 'Imported from Java push TCP'
      }
    });

    await prisma.scheduleItem.upsert({
      where: { externalScheduleId: scheduleId },
      update: {
        subjectId: subject.id,
        groupId: group.id,
        teacherExternalId: teacherName,
        startsAt,
        endsAt,
        syncedAt: new Date()
      },
      create: {
        externalScheduleId: scheduleId,
        subjectId: subject.id,
        groupId: group.id,
        teacherExternalId: teacherName,
        startsAt,
        endsAt
      }
    });

    imported += 1;
  }

  return imported;
};

export const startSubjectPushTcpServer = (logger: FastifyBaseLogger, config: PushConfig): net.Server => {
  const server = net.createServer((socket) => {
    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
    });

    socket.on('end', async () => {
      try {
        const trimmed = buffer.trim();
        if (!trimmed) {
          socket.write('{"status":"error","message":"empty payload"}\n');
          socket.end();
          return;
        }

        const parsed = JSON.parse(trimmed) as unknown;
        const items = parsePayload(parsed);
        const imported = await persistSubjects(items, config);
        logger.info(
          {
            remoteAddress: socket.remoteAddress,
            remotePort: socket.remotePort,
            received: items.length,
            imported
          },
          'Java subject push processed'
        );

        socket.write(JSON.stringify({ status: 'ok', imported }) + '\n');
        socket.end();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        logger.error({ err: error }, 'Failed to process Java push payload');
        socket.write(JSON.stringify({ status: 'error', message }) + '\n');
        socket.end();
      }
    });

    socket.on('error', (error) => {
      logger.error({ err: error }, 'Push TCP socket error');
    });
  });

  server.on('error', (error) => {
    logger.error({ err: error }, 'Push TCP server error');
  });

  server.listen(config.port, '0.0.0.0', () => {
    logger.info(`Java push TCP listener started on 0.0.0.0:${config.port}`);
  });

  return server;
};
