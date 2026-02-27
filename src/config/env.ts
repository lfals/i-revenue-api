import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOCAL_DB: z.string().min(1, 'LOCAL_DB é obrigatório'),
  TURSO_AUTH_TOKEN: z.string().optional(),
  TURSO_DATABASE_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  SECRET: z.string().optional(),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET é obrigatório'),
  REFRESH_JWT_SECRET: z.string().optional(),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().optional(),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().optional(),
  OTEL_SERVICE_NAME: z.string().default('i-revenue-api'),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
  const missingVars = result.error.issues
    .map((issue) => issue.path.join('.'))
    .filter(Boolean)
    .join(', ')

  throw new Error(`Variáveis de ambiente inválidas: ${missingVars}`)
}

export const env = result.data
