import type { FastifyPluginAsync } from 'fastify';
import { Difficulty, QuestionType, Role } from '@prisma/client';
import { z } from 'zod';
import {
  generateTestForStudent,
  getAttemptResult,
  getAttemptReview,
  getTestDetailsForStudent,
  submitTestAttempt
} from '../services/test-service.js';
import { errorResponse } from '../utils/api-error.js';

const generateSchema = z.object({
  subjectId: z.string().min(1),
  difficulty: z.nativeEnum(Difficulty),
  questionTypes: z.array(z.nativeEnum(QuestionType)).min(1),
  questionCount: z.number().int().min(3).max(40).default(10),
  topicIds: z.array(z.string()).default([]),
  language: z.string().default('ru')
});

const submitSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        selectedOptionIds: z.array(z.string()).optional(),
        answerText: z.string().optional()
      })
    )
    .min(1),
  clientDurationSec: z.number().int().positive().optional()
});

const testsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/tests/generate', { preHandler: fastify.authorize([Role.STUDENT]) }, async (request, reply) => {
    const parsed = generateSchema.safeParse(request.body);
    if (!parsed.success || !request.authUser) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid payload', request.traceId));
    }

    try {
      const result = await generateTestForStudent(request.authUser.userId, parsed.data);
      return result;
    } catch (error) {
      fastify.log.error({ err: error, traceId: request.traceId }, 'Test generation failed');
      return reply.code(422).send(errorResponse('BUSINESS_RULE_VIOLATION', 'Cannot generate test', request.traceId));
    }
  });

  fastify.get('/tests/:testId', { preHandler: fastify.authorize([Role.STUDENT]) }, async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Unauthorized', request.traceId));
    }

    const { testId } = request.params as { testId: string };
    const test = await getTestDetailsForStudent(testId, request.authUser.userId);
    if (!test) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Test not found', request.traceId));
    }

    return test;
  });

  fastify.post('/tests/:testId/submit', { preHandler: fastify.authorize([Role.STUDENT]) }, async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Unauthorized', request.traceId));
    }

    const parsed = submitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid payload', request.traceId));
    }

    const { testId } = request.params as { testId: string };

    try {
      const result = await submitTestAttempt(testId, request.authUser.userId, parsed.data);
      return {
        attemptId: result.attemptId,
        status: result.status
      };
    } catch {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Test not found', request.traceId));
    }
  });

  fastify.get('/attempts/:attemptId/result', { preHandler: fastify.authorize([Role.STUDENT]) }, async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Unauthorized', request.traceId));
    }

    const { attemptId } = request.params as { attemptId: string };
    const result = await getAttemptResult(attemptId, request.authUser.userId);
    if (!result) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Attempt result not found', request.traceId));
    }

    return result;
  });

  fastify.get('/attempts/:attemptId/review', { preHandler: fastify.authorize([Role.STUDENT]) }, async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Unauthorized', request.traceId));
    }

    const { attemptId } = request.params as { attemptId: string };
    const review = await getAttemptReview(attemptId, request.authUser.userId);
    if (!review) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Attempt review not found', request.traceId));
    }

    return review;
  });
};

export default testsRoutes;
