import type { Context, Next } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { buildSuccessResponse } from '../http/success-response'

export async function responseEnvelope(c: Context, next: Next) {
  if (c.req.path === '/openapi.json' || c.req.path.startsWith('/docs')) {
    await next()
    return
  }

  const originalJson = c.json.bind(c)

  c.json = ((data: unknown, status?: number, headers?: HeadersInit) => {
    const httpStatus = (status ?? 200) as ContentfulStatusCode
    const hasEnvelope =
      !!data &&
      typeof data === 'object' &&
      'success' in (data as Record<string, unknown>) &&
      'status' in (data as Record<string, unknown>)

    if (httpStatus >= 400 || hasEnvelope) {
      return originalJson(data as never, { status: httpStatus, headers })
    }

    return originalJson(buildSuccessResponse(httpStatus, 'Sucesso', data), {
      status: httpStatus,
      headers,
    })
  }) as typeof c.json

  await next()
}
