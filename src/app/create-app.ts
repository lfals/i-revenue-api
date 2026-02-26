import { Hono } from 'hono'
import { prettyJSON } from 'hono/pretty-json'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import authRoutes from '../modules/auth/auth.routes'
import type { JwtPayload } from '../infra/security/jwt.service'
import { getUserFromJWT } from '../infra/security/jwt.service'
import { AppError } from '../shared/errors/app-error'
import { ERROR_CODES } from '../shared/errors/error-codes'
import { buildErrorResponse } from '../shared/http/error-response'
import { logger } from '../shared/logger/logger'
import { requestLogger } from '../shared/middlewares/request-logger'
import { responseEnvelope } from '../shared/middlewares/response-envelope'

export function createApp() {
  const app = new Hono<{ Variables: { authUser: JwtPayload } }>()
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

  app.use('/api/*', async (c, next) => {
    const authorization = c.req.header('authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new AppError(
        401,
        'Bearer é obrigatório',
        ERROR_CODES.MISSING_TOKEN,
        [{ code: ERROR_CODES.MISSING_TOKEN, message: 'Bearer é obrigatório' }],
        { 'WWW-Authenticate': 'Bearer realm="api"' },
      )
    }

    const token = authorization.slice('Bearer '.length).trim()
    if (!token) {
      throw new AppError(
        401,
        'Bearer é obrigatório',
        ERROR_CODES.MISSING_TOKEN,
        [{ code: ERROR_CODES.MISSING_TOKEN, message: 'Bearer é obrigatório' }],
        { 'WWW-Authenticate': 'Bearer realm="api"' },
      )
    }

    const authUser = await getUserFromJWT(token)
    c.set('authUser', authUser)

    await next()
  })

  app.get('/api/page', (c) => {
    const authUser = c.get('authUser')
    return c.json({ message: 'You are authorized', authUser }, 200)
  })

  app.notFound((c) => {
    const message = 'Rota não encontrada'
    return c.json(buildErrorResponse(404, message, [{ code: ERROR_CODES.NOT_FOUND, message }]), 404)
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
    return c.json(buildErrorResponse(500, message, [{ code: ERROR_CODES.INTERNAL_ERROR, message }]), 500)
  })

  return app
}
