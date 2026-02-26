import type { Context, Next } from 'hono'
import { buildSuccessResponse } from '../utils/success-response.util'

export async function responseEnvelope(c: Context, next: Next) {
  const originalJson = c.json.bind(c)

  c.json = ((data: unknown, status?: number, headers?: HeadersInit) => {
    const httpStatus = status ?? 200
    const hasEnvelope =
      !!data &&
      typeof data === 'object' &&
      'success' in (data as Record<string, unknown>) &&
      'status' in (data as Record<string, unknown>)

    if (httpStatus >= 400 || hasEnvelope) {
      return originalJson(data as never, httpStatus, headers)
    }

    return originalJson(
      buildSuccessResponse(httpStatus, 'Sucesso', data),
      httpStatus,
      headers,
    )
  }) as typeof c.json

  await next()
}
