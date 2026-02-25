import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  SCHEDULE_PROVIDER_MODE: z.enum(['http', 'tcp', 'push']).default('http'),
  SCHEDULE_PROVIDER_HTTP_URL: z.string().url().optional(),
  SCHEDULE_PROVIDER_TCP_HOST: z.string().optional(),
  SCHEDULE_PROVIDER_TCP_PORT: z.coerce.number().optional(),
  SCHEDULE_PROVIDER_TIMEOUT_MS: z.coerce.number().default(4000),
  SCHEDULE_PUSH_TCP_ENABLED: z.coerce.boolean().default(false),
  SCHEDULE_PUSH_TCP_PORT: z.coerce.number().default(4100),
  SCHEDULE_PUSH_DEFAULT_GROUP: z.string().default('CS-101'),
  SCHEDULE_PUSH_DEFAULT_SEMESTER: z.string().default('UNSPECIFIED'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  ROOM_FINDER_JAVA_URL: z.string().url().optional(),
  ROOM_FINDER_API_KEY: z.string().optional()
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

export const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((x) => x.trim()).filter(Boolean);
