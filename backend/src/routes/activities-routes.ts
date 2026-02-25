import type { FastifyPluginAsync } from 'fastify';
import { ActivityType, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { generateActivityReply } from '../services/activity-ai-service.js';
import { resolveSubjectId } from '../services/subject-service.js';
import { errorResponse } from '../utils/api-error.js';

const createSchema = z.object({
  type: z.nativeEnum(ActivityType),
  subjectId: z.string().min(1),
  transcript: z
    .array(
      z.object({
        role: z.enum(['student', 'ai']),
        text: z.string().min(1)
      })
    )
    .min(2)
});

const nextTurnSchema = z.object({
  type: z.nativeEnum(ActivityType),
  subjectId: z.string().min(1),
  transcript: z.array(
    z.object({
      role: z.enum(['student', 'ai']),
      text: z.string().min(1)
    })
  ),
  studentMessage: z.string().min(1).optional()
});

const calcScore = (
  type: ActivityType,
  transcript: {
    role: 'student' | 'ai';
    text: string;
  }[]
) => {
  const studentMessages = transcript.filter((m) => m.role === 'student');
  const totalChars = studentMessages.reduce((acc, row) => acc + row.text.length, 0);
  const avgLen = studentMessages.length ? totalChars / studentMessages.length : 0;
  const corrections = studentMessages.filter((m) => /ошиб|исправ|неверно|уточн/i.test(m.text)).length;

  if (type === ActivityType.FEYNMAN) {
    const clarity = Math.min(5, Math.max(1, avgLen / 80));
    const completeness = Math.min(5, Math.max(1, studentMessages.length / 2));
    const correctness = Math.min(5, Math.max(1, 3 + corrections * 0.5));
    const fixes = Math.min(5, Math.max(1, corrections + 1));
    const total = Number((((clarity * 25 + completeness * 25 + correctness * 35 + fixes * 15) / 5)).toFixed(2));
    return {
      clarity: Number(clarity.toFixed(2)),
      completeness: Number(completeness.toFixed(2)),
      correctness: Number(correctness.toFixed(2)),
      fixes: Number(fixes.toFixed(2)),
      total
    };
  }

  const thesis = Math.min(5, Math.max(1, avgLen / 90));
  const argumentation = Math.min(5, Math.max(1, studentMessages.length / 2));
  const rebuttal = Math.min(5, Math.max(1, corrections + 1));
  const structure = Math.min(5, Math.max(1, transcript.length / 4));
  const total = Number((((thesis * 30 + argumentation * 30 + rebuttal * 25 + structure * 15) / 5)).toFixed(2));

  return {
    thesis: Number(thesis.toFixed(2)),
    argumentation: Number(argumentation.toFixed(2)),
    rebuttal: Number(rebuttal.toFixed(2)),
    structure: Number(structure.toFixed(2)),
    total
  };
};

const activitiesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/activities/next-turn', { preHandler: fastify.authorize([Role.STUDENT]) }, async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Unauthorized', request.traceId));
    }

    const parsed = nextTurnSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid payload', request.traceId));
    }

    const subjectId = await resolveSubjectId(parsed.data.subjectId);
    if (!subjectId) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Subject not found', request.traceId));
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        name: true
      }
    });
    if (!subject) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Subject not found', request.traceId));
    }

    const transcript = parsed.data.transcript.map((item) => ({
      role: item.role,
      text: item.text.trim()
    }));
    if (parsed.data.studentMessage?.trim()) {
      transcript.push({
        role: 'student',
        text: parsed.data.studentMessage.trim()
      });
    }

    const ai = await generateActivityReply({
      type: parsed.data.type,
      subjectName: subject.name,
      transcript
    });

    const nextTranscript = [...transcript, { role: 'ai' as const, text: ai.aiText }];

    return {
      type: parsed.data.type,
      subjectId: subject.id,
      subjectName: subject.name,
      aiRole: ai.roleLabel,
      aiMessage: ai.aiText,
      transcript: nextTranscript
    };
  });

  fastify.post('/activities', { preHandler: fastify.authorize([Role.STUDENT]) }, async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Unauthorized', request.traceId));
    }

    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid payload', request.traceId));
    }

    const subjectId = await resolveSubjectId(parsed.data.subjectId);
    if (!subjectId) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Subject not found', request.traceId));
    }

    const score = calcScore(parsed.data.type, parsed.data.transcript);

    const session = await prisma.activitySession.create({
      data: {
        studentId: request.authUser.userId,
        subjectId,
        type: parsed.data.type,
        transcriptJson: parsed.data.transcript,
        scoreJson: score
      }
    });

    return {
      sessionId: session.id,
      type: session.type,
      subjectId,
      score,
      reviewStatus: session.reviewStatus
    };
  });

  fastify.get('/activities/history', { preHandler: fastify.authorize([Role.STUDENT]) }, async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Unauthorized', request.traceId));
    }

    const items = await prisma.activitySession.findMany({
      where: {
        studentId: request.authUser.userId
      },
      include: {
        subject: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    return {
      items: items.map((item) => ({
        sessionId: item.id,
        type: item.type,
        subjectId: item.subjectId,
        subjectName: item.subject.name,
        score: item.scoreJson,
        reviewStatus: item.reviewStatus,
        createdAt: item.createdAt.toISOString()
      }))
    };
  });
};

export default activitiesRoutes;
