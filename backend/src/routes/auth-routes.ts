import type { FastifyPluginAsync } from 'fastify';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { issueRefreshToken, revokeRefreshToken, rotateRefreshToken } from '../services/auth-service.js';
import { writeAuditLog } from '../services/audit-service.js';
import { errorResponse } from '../utils/api-error.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  locale: z.string().default('ru')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20).optional()
}).default({});

const makeStudentNo = (): string => `STU-${Date.now()}`;
const DEFAULT_STUDENT_GROUP_CODE = 'GLOBAL';

const REFRESH_COOKIE_NAME = 'visualsite_rt';

const parseRefreshTtlSec = (): number => {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';
  const daysMatch = raw.match(/^(\d+)d$/);
  if (daysMatch) {
    return Number(daysMatch[1]) * 24 * 60 * 60;
  }
  const hoursMatch = raw.match(/^(\d+)h$/);
  if (hoursMatch) {
    return Number(hoursMatch[1]) * 60 * 60;
  }
  return 30 * 24 * 60 * 60;
};

const makeRefreshCookie = (refreshToken: string): string => {
  const parts = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}`,
    'Path=/',
    `Max-Age=${parseRefreshTtlSec()}`,
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
};

const makeClearRefreshCookie = (): string => {
  const parts = [
    `${REFRESH_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
};

const readCookie = (cookieHeader: string | undefined, name: string): string | null => {
  if (!cookieHeader) {
    return null;
  }
  const tokens = cookieHeader.split(';').map((part) => part.trim());
  const found = tokens.find((part) => part.startsWith(`${name}=`));
  if (!found) {
    return null;
  }
  const raw = found.slice(name.length + 1);
  if (!raw) {
    return null;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me', { preHandler: fastify.authenticate }, async (request, reply) => {
    if (!request.authUser) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Authentication required', request.traceId));
    }

    const user = await prisma.user.findUnique({
      where: { id: request.authUser.userId },
      include: {
        studentProfile: true
      }
    });

    if (!user) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'User not found', request.traceId));
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      locale: user.locale,
      studentProfile: user.studentProfile
        ? {
            fullName: user.studentProfile.fullName,
            studentNo: user.studentProfile.studentNo
          }
        : null
    };
  });

  fastify.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid registration payload', request.traceId));
    }

    const data = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return reply.code(409).send(errorResponse('CONFLICT', 'User already exists', request.traceId));
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: Role.STUDENT,
          locale: data.locale
        }
      });

      const groupCode = DEFAULT_STUDENT_GROUP_CODE;
      const group = await tx.group.upsert({
        where: { code: groupCode },
        update: {},
        create: {
          code: groupCode,
          name: groupCode,
          semester: 'UNSPECIFIED'
        }
      });

      await tx.studentProfile.create({
        data: {
          userId: createdUser.id,
          fullName: data.fullName,
          groupId: group.id,
          studentNo: makeStudentNo()
        }
      });

      return createdUser;
    });

    const accessToken = await fastify.signAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email
    });
    const refreshToken = await issueRefreshToken(user.id);

    await writeAuditLog({
      actorUserId: user.id,
      action: 'AUTH_REGISTER',
      entityType: 'USER',
      entityId: user.id,
      traceId: request.traceId
    });

    reply.header('Set-Cookie', makeRefreshCookie(refreshToken));

    return reply.code(201).send({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresInSec: 900
      }
    });
  });

  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid login payload', request.traceId));
    }

    const data = parsed.data;

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Invalid credentials', request.traceId));
    }

    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Invalid credentials', request.traceId));
    }
    if (user.role !== Role.STUDENT) {
      return reply.code(403).send(errorResponse('FORBIDDEN', 'Only student accounts are enabled', request.traceId));
    }

    const accessToken = await fastify.signAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email
    });
    const refreshToken = await issueRefreshToken(user.id);

    await writeAuditLog({
      actorUserId: user.id,
      action: 'AUTH_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      traceId: request.traceId
    });

    reply.header('Set-Cookie', makeRefreshCookie(refreshToken));

    return {
      user: {
        id: user.id,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresInSec: 900
      }
    };
  });

  fastify.post('/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid refresh token payload', request.traceId));
    }

    const refreshTokenFromCookie = readCookie(request.headers.cookie, REFRESH_COOKIE_NAME);
    const rawToken = parsed.data.refreshToken ?? refreshTokenFromCookie;
    if (!rawToken) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Refresh token missing', request.traceId));
    }

    const refreshed = await rotateRefreshToken(rawToken);
    if (!refreshed) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'Refresh token invalid', request.traceId));
    }

    const user = await prisma.user.findUnique({ where: { id: refreshed.userId } });
    if (!user) {
      return reply.code(401).send(errorResponse('UNAUTHORIZED', 'User not found', request.traceId));
    }
    if (user.role !== Role.STUDENT) {
      return reply.code(403).send(errorResponse('FORBIDDEN', 'Only student accounts are enabled', request.traceId));
    }

    const accessToken = await fastify.signAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email
    });

    reply.header('Set-Cookie', makeRefreshCookie(refreshed.newRawToken));

    return {
      accessToken,
      refreshToken: refreshed.newRawToken,
      expiresInSec: 900
    };
  });

  fastify.post('/logout', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid logout payload', request.traceId));
    }

    const refreshTokenFromCookie = readCookie(request.headers.cookie, REFRESH_COOKIE_NAME);
    const rawToken = parsed.data.refreshToken ?? refreshTokenFromCookie;
    if (rawToken) {
      await revokeRefreshToken(rawToken);
    }
    reply.header('Set-Cookie', makeClearRefreshCookie());

    await writeAuditLog({
      actorUserId: request.authUser?.userId,
      action: 'AUTH_LOGOUT',
      entityType: 'SESSION',
      entityId: 'refresh_token',
      traceId: request.traceId
    });

    return { ok: true };
  });
};

export default authRoutes;
