import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { getSubjectsFromSchedule } from '../services/subject-service.js';
import { errorResponse } from '../utils/api-error.js';

const querySchema = z.object({
  semester: z.string().optional(),
  teacherExternalId: z.string().optional()
});

const scheduleQuerySchema = z.object({
  groupCode: z.string(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
});

const subjectsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/subjects', { preHandler: fastify.authenticate }, async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid query params', request.traceId));
    }

    const data = await getSubjectsFromSchedule({
      semester: parsed.data.semester,
      teacherExternalId: parsed.data.teacherExternalId
    });

    return data;
  });

  fastify.get('/schedule/items', { preHandler: fastify.authenticate }, async (request, reply) => {
    const parsed = scheduleQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid query params', request.traceId));
    }

    const group = await prisma.group.findFirst({
      where: {
        OR: [{ code: parsed.data.groupCode }, { externalGroupCode: parsed.data.groupCode }]
      }
    });

    if (!group) {
      return { items: [] };
    }

    const where: {
      groupId: string;
      startsAt?: { gte?: Date; lte?: Date };
    } = {
      groupId: group.id
    };

    if (parsed.data.dateFrom || parsed.data.dateTo) {
      where.startsAt = {};
      if (parsed.data.dateFrom) {
        where.startsAt.gte = new Date(parsed.data.dateFrom);
      }
      if (parsed.data.dateTo) {
        where.startsAt.lte = new Date(parsed.data.dateTo);
      }
    }

    const items = await prisma.scheduleItem.findMany({
      where,
      include: {
        subject: true
      },
      orderBy: {
        startsAt: 'asc'
      },
      take: 200
    });

    return {
      items: items.map((row) => ({
        scheduleItemId: row.id,
        subjectId: row.subjectId,
        subjectName: row.subject.name,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        room: row.room
      }))
    };
  });
};

export default subjectsRoutes;
