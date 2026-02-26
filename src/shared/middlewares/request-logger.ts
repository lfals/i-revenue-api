import type { Context, Next } from 'hono'
import { logger } from '../logger/logger'

export async function requestLogger(c: Context, next: Next) {
  const startedAt = performance.now()
  const method = c.req.method
  const path = c.req.path
  const requestId = c.req.header('x-request-id') || null
  const userAgent = c.req.header('user-agent') || null

  logger.info('request.started', {
    'http.request.method': method,
    'url.path': path,
    'http.request.header.x_request_id': requestId,
    'user_agent.original': userAgent,
  })

  try {
    await next()
  } finally {
    logger.info('request.completed', {
      'http.request.method': method,
      'url.path': path,
      'http.response.status_code': c.res.status,
      duration_ms: Number((performance.now() - startedAt).toFixed(2)),
      'http.request.header.x_request_id': requestId,
    })
  }
}
