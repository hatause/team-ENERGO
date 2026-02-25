import type { FastifyPluginAsync } from 'fastify';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { writeAuditLog } from '../services/audit-service.js';
import { errorResponse } from '../utils/api-error.js';

const updateRoleSchema = z.object({
  role: z.nativeEnum(Role)
});

const groupSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  semester: z.string().min(1),
  externalGroupCode: z.string().optional()
});

const subjectMappingSchema = z.object({
  externalSubjectCode: z.string().min(1),
  localSubjectName: z.string().min(1),
  description: z.string().optional()
});

const auditQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = fastify.authorize([Role.ADMIN]);

  fastify.post('/admin/users/:userId/role', { preHandler: auth }, async (request, reply) => {
    const parsed = updateRoleSchema.safeParse(request.body);
    if (!parsed.success || !request.authUser) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid payload', request.traceId));
    }

    const { userId } = request.params as { userId: string };
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: parsed.data.role }
    });

    await writeAuditLog({
      actorUserId: request.authUser.userId,
      action: 'ROLE_CHANGED',
      entityType: 'USER',
      entityId: user.id,
      payload: parsed.data,
      traceId: request.traceId
    });

    return { ok: true, userId: user.id, role: user.role };
  });

  fastify.post('/admin/groups', { preHandler: auth }, async (request, reply) => {
    const parsed = groupSchema.safeParse(request.body);
    if (!parsed.success || !request.authUser) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid payload', request.traceId));
    }

    const group = await prisma.group.upsert({
      where: { code: parsed.data.code },
      update: {
        name: parsed.data.name,
        semester: parsed.data.semester,
        externalGroupCode: parsed.data.externalGroupCode
      },
      create: {
        code: parsed.data.code,
        name: parsed.data.name,
        semester: parsed.data.semester,
        externalGroupCode: parsed.data.externalGroupCode
      }
    });

    await writeAuditLog({
      actorUserId: request.authUser.userId,
      action: 'GROUP_UPSERT',
      entityType: 'GROUP',
      entityId: group.id,
      payload: parsed.data,
      traceId: request.traceId
    });

    return { groupId: group.id, ok: true };
  });

  fastify.post('/admin/subject-mappings', { preHandler: auth }, async (request, reply) => {
    const parsed = subjectMappingSchema.safeParse(request.body);
    if (!parsed.success || !request.authUser) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid payload', request.traceId));
    }

    const subject = await prisma.subject.upsert({
      where: {
        externalSubjectCode: parsed.data.externalSubjectCode
      },
      update: {
        name: parsed.data.localSubjectName,
        description: parsed.data.description
      },
      create: {
        externalSubjectCode: parsed.data.externalSubjectCode,
        name: parsed.data.localSubjectName,
        description: parsed.data.description
      }
    });

    await writeAuditLog({
      actorUserId: request.authUser.userId,
      action: 'SUBJECT_MAPPING_UPSERT',
      entityType: 'SUBJECT',
      entityId: subject.id,
      payload: parsed.data,
      traceId: request.traceId
    });

    return { subjectId: subject.id, ok: true };
  });

  fastify.get('/admin/audit-logs', { preHandler: auth }, async (request, reply) => {
    const parsed = auditQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid query', request.traceId));
    }

    const where = {
      createdAt: {
        ...(parsed.data.from ? { gte: new Date(parsed.data.from) } : {}),
        ...(parsed.data.to ? { lte: new Date(parsed.data.to) } : {})
      }
    };

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parsed.data.page - 1) * parsed.data.pageSize,
        take: parsed.data.pageSize
      })
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        actorUserId: item.actorUserId,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        createdAt: item.createdAt.toISOString(),
        traceId: item.traceId
      })),
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total
    };
  });
};

export default adminRoutes;
