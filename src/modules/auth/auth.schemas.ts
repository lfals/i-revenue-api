import { z } from '@hono/zod-openapi'
import { ERROR_CODES, type ErrorCode } from '../../shared/errors/error-codes'

const appErrorCodeValues = Object.values(ERROR_CODES) as [ErrorCode, ...ErrorCode[]]

export const appErrorCodeSchema = z
  .enum(appErrorCodeValues)
  .openapi({
    description:
      'Códigos de erro de negócio disponíveis em src/shared/errors/error-codes.ts',
    example: ERROR_CODES.INVALID_CREDENTIALS,
  })

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  email: z.email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
}).openapi('RegisterRequest')

export const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
}).openapi('LoginRequest')

export const authUserSchema = z.object({
  id: z.string(),
  name: z.string(),
}).openapi('AuthUser')

export const registerResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
  data: z.object({
    message: z.string(),
    user: authUserSchema.extend({
      token: z.string(),
    }),
  }),
}).openapi('RegisterResponse')

export const loginResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
  data: z.object({
    message: z.string(),
    id: z.string(),
    name: z.string(),
    token: z.string(),
  }),
}).openapi('LoginResponse')

export const errorItemSchema = z.object({
  code: z.union([appErrorCodeSchema, z.string()]).openapi({
    description:
      'Pode retornar um código de negócio (enum) ou um código técnico de validação (ex: invalid_string, too_small).',
    example: ERROR_CODES.INVALID_CREDENTIALS,
  }),
  message: z.string(),
  path: z.string().optional(),
}).openapi('ApiErrorItem')

export const errorResponseSchema = z.object({
  success: z.boolean().default(false),
  status: z.number(),
  message: z.string(),
  errors: z.array(errorItemSchema),
}).openapi('ErrorResponse')

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type AppErrorCode = z.infer<typeof appErrorCodeSchema>
