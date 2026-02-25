import type { FastifyPluginAsync } from 'fastify';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { resolveSubjectId } from '../services/subject-service.js';
import { errorResponse } from '../utils/api-error.js';

const listQuery = z.object({
  subjectId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const historyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/history/attempts', { preHandler: fastify.authorize([Role.STUDENT]) }, async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Unauthorized', request.traceId));
    }

    const parsed = listQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid query', request.traceId));
    }

    const subjectId = parsed.data.subjectId ? await resolveSubjectId(parsed.data.subjectId) : null;
    if (parsed.data.subjectId && !subjectId) {
      return {
        items: [],
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total: 0
      };
    }

    const where = {
      studentId: request.authUser.userId,
      ...(subjectId
        ? {
            test: {
              subjectId
            }
          }
        : {})
    };

    const [total, items] = await Promise.all([
      prisma.testAttempt.count({ where }),
      prisma.testAttempt.findMany({
        where,
        include: {
          test: true
        },
        orderBy: { submittedAt: 'desc' },
        skip: (parsed.data.page - 1) * parsed.data.pageSize,
        take: parsed.data.pageSize
      })
    ]);

    return {
      items: items.map((row) => ({
        attemptId: row.id,
        subjectId: row.test.subjectId,
        scorePercent: row.scorePercent,
        passed: row.passed,
        submittedAt: row.submittedAt?.toISOString()
      })),
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total
    };
  });

  fastify.get('/history/attempts/:attemptId', { preHandler: fastify.authorize([Role.STUDENT]) }, async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Unauthorized', request.traceId));
    }

    const { attemptId } = request.params as { attemptId: string };

    const attempt = await prisma.testAttempt.findFirst({
      where: {
        id: attemptId,
        studentId: request.authUser.userId
      },
      include: {
        test: {
          include: {
            questions: {
              include: {
                options: true
              }
            }
          }
        },
        answers: true,
        feedback: true
      }
    });

    if (!attempt) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Attempt not found', request.traceId));
    }

    return {
      attemptId: attempt.id,
      testId: attempt.testId,
      answers: attempt.answers.map((a) => ({
        questionId: a.questionId,
        selectedOptionIds: a.selectedOptionIds,
        answerText: a.answerText,
        score: a.scorePoints,
        isCorrect: a.isCorrect,
        rationale: a.rationale
      })),
      feedback: {
        summary: attempt.feedback?.summary,
        mistakes: attempt.feedback?.mistakesJson ?? []
      }
    };
  });
};

export default historyRoutes;
