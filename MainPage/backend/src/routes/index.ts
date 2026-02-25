import type { FastifyPluginAsync } from 'fastify';
import authRoutes from './auth-routes.js';
import subjectsRoutes from './subjects-routes.js';
import testsRoutes from './tests-routes.js';
import historyRoutes from './history-routes.js';
import activitiesRoutes from './activities-routes.js';
import roomsRoutes from './rooms-routes.js';

const apiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => ({ ok: true, service: 'visualsite-backend' }));

  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(subjectsRoutes);
  await fastify.register(testsRoutes);
  await fastify.register(historyRoutes);
  await fastify.register(activitiesRoutes);
  await fastify.register(roomsRoutes);
};

export default apiRoutes;
