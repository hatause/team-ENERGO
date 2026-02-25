import type { FastifyPluginAsync } from 'fastify';
import { ActivityReviewStatus, ActivityType, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { resolveSubjectId } from '../services/subject-service.js';
import { errorResponse } from '../utils/api-error.js';

const summaryQuerySchema = z.object({
  groupCode: z.string(),
  subjectId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

const studentQuerySchema = z.object({
  subjectId: z.string().optional()
});

const weakTopicsQuerySchema = z.object({
  groupCode: z.string(),
  subjectId: z.string().optional()
});

const activitiesQuerySchema = z.object({
  groupCode: z.string(),
  type: z.nativeEnum(ActivityType).optional(),
  status: z.nativeEnum(ActivityReviewStatus).optional()
});

const teacherRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = fastify.authorize([Role.TEACHER, Role.ADMIN]);

  fastify.get('/teacher/analytics/summary', { preHandler: auth }, async (request, reply) => {
    const parsed = summaryQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid query', request.traceId));
    }

    const group = await prisma.group.findFirst({
      where: {
        OR: [{ code: parsed.data.groupCode }, { externalGroupCode: parsed.data.groupCode }]
      },
      include: {
        students: true
      }
    });

    if (!group) {
      return {
        groupCode: parsed.data.groupCode,
        subjectId: parsed.data.subjectId,
        attempts: 0,
        avgScore: 0,
        passRate: 0,
        weeklyTrend: []
      };
    }

    const studentUserIds = group.students.map((s) => s.userId);
    const resolvedSubjectId = parsed.data.subjectId ? await resolveSubjectId(parsed.data.subjectId) : null;

    const where = {
      studentId: { in: studentUserIds },
      submittedAt: {
        ...(parsed.data.from ? { gte: new Date(parsed.data.from) } : {}),
        ...(parsed.data.to ? { lte: new Date(parsed.data.to) } : {})
      },
      ...(resolvedSubjectId
        ? {
            test: {
              subjectId: resolvedSubjectId
            }
          }
        : {})
    };

    const attempts = await prisma.testAttempt.findMany({
      where,
      include: { test: true },
      orderBy: { submittedAt: 'asc' }
    });

    const scored = attempts.filter((a) => a.scorePercent !== null);
    const avgScore = scored.length
      ? Number((scored.reduce((acc, row) => acc + Number(row.scorePercent ?? 0), 0) / scored.length).toFixed(2))
      : 0;
    const passRate = scored.length ? Number((scored.filter((a) => a.passed).length / scored.length).toFixed(2)) : 0;

    const weekMap = new Map<string, number[]>();
    for (const row of scored) {
      if (!row.submittedAt) {
        continue;
      }
      const d = row.submittedAt;
      const weekKey = `${d.getUTCFullYear()}-W${String(Math.ceil((d.getUTCDate() + 6) / 7)).padStart(2, '0')}`;
      const list = weekMap.get(weekKey) ?? [];
      list.push(Number(row.scorePercent ?? 0));
      weekMap.set(weekKey, list);
    }

    const weeklyTrend = [...weekMap.entries()].map(([week, values]) => ({
      week,
      avgScore: Number((values.reduce((acc, v) => acc + v, 0) / values.length).toFixed(2))
    }));

    return {
      groupCode: group.code,
      subjectId: resolvedSubjectId ?? parsed.data.subjectId,
      attempts: attempts.length,
      avgScore,
      passRate,
      weeklyTrend
    };
  });

  fastify.get('/teacher/analytics/students/:studentId', { preHandler: auth }, async (request, reply) => {
    const parsed = studentQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid query', request.traceId));
    }

    const { studentId } = request.params as { studentId: string };
    const resolvedSubjectId = parsed.data.subjectId ? await resolveSubjectId(parsed.data.subjectId) : null;

    const attempts = await prisma.testAttempt.findMany({
      where: {
        studentId,
        ...(resolvedSubjectId
          ? {
              test: {
                subjectId: resolvedSubjectId
              }
            }
          : {})
      },
      include: { test: true }
    });

    const scored = attempts.filter((a) => a.scorePercent !== null);
    const avgScore = scored.length
      ? Number((scored.reduce((acc, row) => acc + Number(row.scorePercent ?? 0), 0) / scored.length).toFixed(2))
      : 0;

    const weakTopics = await prisma.weakTopic.findMany({
      where: {
        studentId,
        ...(resolvedSubjectId ? { subjectId: resolvedSubjectId } : {})
      },
      orderBy: { weaknessScore: 'desc' },
      take: 10
    });

    return {
      studentId,
      subjectId: resolvedSubjectId ?? parsed.data.subjectId,
      attempts: attempts.length,
      avgScore,
      weakTopics: weakTopics.map((t) => ({
        topicCode: t.topicCode,
        weaknessScore: t.weaknessScore
      }))
    };
  });

  fastify.get('/teacher/analytics/weak-topics', { preHandler: auth }, async (request, reply) => {
    const parsed = weakTopicsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid query', request.traceId));
    }

    const group = await prisma.group.findFirst({
      where: {
        OR: [{ code: parsed.data.groupCode }, { externalGroupCode: parsed.data.groupCode }]
      },
      include: { students: true }
    });

    if (!group) {
      return { items: [] };
    }

    const subjectId = parsed.data.subjectId ? await resolveSubjectId(parsed.data.subjectId) : null;

    const topics = await prisma.weakTopic.findMany({
      where: {
        studentId: {
          in: group.students.map((s) => s.userId)
        },
        ...(subjectId ? { subjectId } : {})
      }
    });

    const map = new Map<string, number[]>();
    for (const row of topics) {
      const list = map.get(row.topicCode) ?? [];
      list.push(row.weaknessScore);
      map.set(row.topicCode, list);
    }

    const items = [...map.entries()]
      .map(([topicCode, values]) => ({
        topicCode,
        errorRate: Number((values.reduce((acc, v) => acc + v, 0) / values.length).toFixed(2))
      }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 20);

    return { items };
  });

  fastify.get('/teacher/activities', { preHandler: auth }, async (request, reply) => {
    const parsed = activitiesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid query', request.traceId));
    }

    const group = await prisma.group.findFirst({
      where: {
        OR: [{ code: parsed.data.groupCode }, { externalGroupCode: parsed.data.groupCode }]
      },
      include: {
        students: true
      }
    });

    if (!group) {
      return { items: [] };
    }

    const items = await prisma.activitySession.findMany({
      where: {
        studentId: {
          in: group.students.map((s) => s.userId)
        },
        ...(parsed.data.type ? { type: parsed.data.type } : {}),
        ...(parsed.data.status ? { reviewStatus: parsed.data.status } : {})
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    return {
      items: items.map((item) => ({
        sessionId: item.id,
        studentId: item.studentId,
        type: item.type,
        aiScore: Number((item.scoreJson as { total?: number })?.total ?? 0),
        submittedAt: item.createdAt.toISOString(),
        reviewStatus: item.reviewStatus
      }))
    };
  });
};

export default teacherRoutes;
