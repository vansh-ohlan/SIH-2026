import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const configSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/bhusetu_db'),
  AI_ML_SERVICE_URL: z.string().default('http://localhost:8000'),
  GEOSERVER_URL: z.string().default('http://localhost:8080/geoserver'),
  JWT_SECRET: z.string().default('bhu-setu-dev-jwt-secret-2026'),
  JWT_EXPIRES_IN: z.string().default('1h')
});

const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid configuration values:', parsedConfig.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = parsedConfig.data;
export type Config = z.infer<typeof configSchema>;
