import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';

type AccessTokenPayload = {
  userId: string;
  role: Role;
  email: string;
};

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (roles: Role[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    signAccessToken: (payload: AccessTokenPayload) => Promise<string>;
  }
}

export default fp(async (fastify) => {
  await fastify.register(fastifyJwt, {
    secret: env.JWT_ACCESS_SECRET
  });

  fastify.decorate('signAccessToken', async (payload: AccessTokenPayload) => {
    return fastify.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify<AccessTokenPayload>();
      request.authUser = {
        userId: payload.userId,
        role: payload.role,
        email: payload.email
      };
    } catch {
      reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          traceId: request.traceId,
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  fastify.decorate('authorize', (roles: Role[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      await fastify.authenticate(request, reply);
      if (reply.sent) {
        return;
      }
      if (!request.authUser || !roles.includes(request.authUser.role)) {
        reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient role',
            traceId: request.traceId,
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  });
});
