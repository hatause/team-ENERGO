import fp from 'fastify-plugin';
import { newTraceId } from '../utils/trace.js';

export default fp(async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const incomingTraceId = request.headers['x-trace-id'];
    const traceId = typeof incomingTraceId === 'string' ? incomingTraceId : newTraceId();
    request.traceId = traceId;
    reply.header('x-trace-id', traceId);
  });

  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({ err: error, traceId: request.traceId }, 'Unhandled error');
    if (reply.sent) {
      return;
    }
    reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        traceId: request.traceId,
        timestamp: new Date().toISOString()
      }
    });
  });
});
