import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { prettyJSON } from 'hono/pretty-json'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import authRoutes from '../modules/auth/auth.routes'
import { validateJWT } from '../infra/security/jwt.service'
import { AppError } from '../shared/errors/app-error'
import { buildErrorResponse } from '../shared/http/error-response'
import { logger } from '../shared/logger/logger'
import { requestLogger } from '../shared/middlewares/request-logger'
import { responseEnvelope } from '../shared/middlewares/response-envelope'

export function createApp() {
  const app = new Hono()
  const startedAt = Date.now()

  app.use(prettyJSON())
  app.use('*', requestLogger)
  app.use('*', responseEnvelope)

  app.route('/auth', authRoutes)

  app.get('/health', (c) => {
    return c.json(
      {
        message: 'Serviço disponível',
        uptime: `${Math.floor((Date.now() - startedAt) / 1000)}s`,
      },
      200,
    )
  })

  app.use(
    '/api/*',
    bearerAuth({
      verifyToken: validateJWT,
      noAuthenticationHeader: {
        message: 'Bearer é obrigatório',
      },
    }),
  )

  app.get('/api/page', (c) => c.json({ message: 'You are authorized' }, 200))

  app.notFound((c) => {
    const message = 'Rota não encontrada'
    return c.json(buildErrorResponse(404, message, [{ code: 'not_found', message }]), 404)
  })

  app.onError((error, c) => {
    if (error instanceof AppError) {
      const status = error.status as ContentfulStatusCode

      if (error.headers) {
        for (const [key, value] of Object.entries(error.headers)) {
          c.header(key, value)
        }
      }

      logger.warn('request.handled_error', {
        'http.request.method': c.req.method,
        'url.path': c.req.path,
        'http.response.status_code': error.status,
        code: error.code,
        message: error.message,
      })

      return c.json(
        buildErrorResponse(
          status,
          error.message,
          error.details.length
            ? error.details
            : [{ code: error.code, message: error.message }],
        ),
        status,
      )
    }

    logger.error('request.unhandled_error', {
      'http.request.method': c.req.method,
      'url.path': c.req.path,
      'http.response.status_code': 500,
      error: error instanceof Error ? error.message : 'unknown_error',
    })

    const message = 'Erro interno do servidor'
    return c.json(buildErrorResponse(500, message, [{ code: 'internal_error', message }]), 500)
  })

  return app
}
