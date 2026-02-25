import 'fastify';
import type { Role } from '@prisma/client';

declare module 'fastify' {
  interface FastifyRequest {
    traceId: string;
    authUser?: {
      userId: string;
      role: Role;
      email: string;
    };
  }
}
