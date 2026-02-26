import { zValidator as baseZValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodSchema } from 'zod'
import { buildErrorResponse } from './error-response.util'

export const zValidator = <T extends ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) =>
  baseZValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json(
        buildErrorResponse(
          400,
          'Dados inválidos',
          result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        ),
        400,
      )
    }
  })
