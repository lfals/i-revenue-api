import type { Hook } from '@hono/zod-openapi'
import { buildErrorResponse } from './error-response'

export const openApiValidatorHook: Hook<any, any, any, any> = (result, c) => {
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
}
