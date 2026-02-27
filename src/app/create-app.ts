import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { prettyJSON } from 'hono/pretty-json'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import appRoutes from '../modules/app/app.routes'
import authRoutes from '../modules/auth/auth.routes'
import type { JwtPayload } from '../infra/security/jwt.service'
import { getUserFromJWT } from '../infra/security/jwt.service'
import { AppError } from '../shared/errors/app-error'
import { ERROR_CODES } from '../shared/errors/error-codes'
import { buildErrorResponse } from '../shared/http/error-response'
import { logger } from '../shared/logger/logger'
import { requestLogger } from '../shared/middlewares/request-logger'
import { responseEnvelope } from '../shared/middlewares/response-envelope'

const healthResponseSchema = z
  .object({
    success: z.boolean(),
    status: z.number(),
    message: z.string(),
    data: z.object({
      message: z.string(),
      uptime: z.string(),
    }),
  })
  .openapi('HealthResponse')

export function createApp() {
  const app = new OpenAPIHono<{ Variables: { authUser: JwtPayload } }>()
  const startedAt = Date.now()
  app.openAPIRegistry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  })

  app.use(prettyJSON())
  app.use('*', requestLogger)
  app.use('*', responseEnvelope)

  app.route('/auth', authRoutes)

  const healthRoute = createRoute({
    method: 'get',
    path: '/health',
    tags: ['Health'],
    summary: 'Status de disponibilidade da API',
    responses: {
      200: {
        description: 'Serviço disponível',
        content: {
          'application/json': {
            schema: healthResponseSchema,
            example: {
              success: true,
              status: 200,
              message: 'API operacional',
              data: {
                message: 'Serviço disponível',
                uptime: '142s',
              },
            },
          },
        },
      },
    },
  })

  app.openapi(healthRoute, (c) => {
    return c.json(
      {
        success: true,
        status: 200,
        message: 'API operacional',
        data: {
          message: 'Serviço disponível',
          uptime: `${Math.floor((Date.now() - startedAt) / 1000)}s`,
        },
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

  app.route('/api', appRoutes)

  app.doc('/openapi.json', {
    openapi: '3.0.0',
    servers: [{
      url: "https://i-revenue-api-production.up.railway.app/",
      description: "Prod"
    },
    {
      url: "https://i-revenue-api-development.up.railway.app",
      description: "Dev"
    },
    {
      url: "http://localhost:3000",
      description: "Local"
    }],
    info: {
      title: 'i-revenue API',
      version: '1.0.0',
      description: 'Documentação da API',
    },
  })

  app.get('/docs', (c) =>
    c.html(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>i-revenue API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
      })
    </script>
  </body>
</html>`),
  )

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
