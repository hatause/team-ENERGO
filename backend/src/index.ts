import 'dotenv/config';
import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import { allowedOrigins, env } from './config/env.js';
import requestContextPlugin from './plugins/request-context.js';
import authPlugin from './plugins/auth.js';
import apiRoutes from './routes/index.js';
import { startSubjectPushTcpServer } from './services/subject-push-tcp-server.js';

const buildApp = () => {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn'
    }
  });

  app.register(sensible);
  app.register(cors, {
    origin: allowedOrigins,
    credentials: true
  });
  app.register(requestContextPlugin);
  app.register(authPlugin);

  app.register(apiRoutes, { prefix: '/api/v1' });

  return app;
};

const start = async () => {
  const app = buildApp();
  let pushTcpServer: import('node:net').Server | null = null;

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Backend listening on port ${env.PORT}`);

    if (env.SCHEDULE_PUSH_TCP_ENABLED) {
      pushTcpServer = startSubjectPushTcpServer(app.log, {
        port: env.SCHEDULE_PUSH_TCP_PORT,
        defaultGroupCode: env.SCHEDULE_PUSH_DEFAULT_GROUP,
        defaultSemester: env.SCHEDULE_PUSH_DEFAULT_SEMESTER
      });
    }
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }

  const gracefulShutdown = async () => {
    try {
      if (pushTcpServer) {
        await new Promise<void>((resolve, reject) => {
          pushTcpServer?.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        });
      }
      await app.close();
      process.exit(0);
    } catch (error) {
      app.log.error(error);
      process.exit(1);
    }
  };

  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
};

start();
