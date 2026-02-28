import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Context, Next } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { prettyJSON } from 'hono/pretty-json'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import appRoutes from '../modules/app/app.routes'
import authRoutes from '../modules/auth/auth.routes'
import revenueRoutes from '../modules/revenue/revenue.routes'
import type { JwtPayload } from '../infra/security/jwt.service'
import { getUserFromJWT } from '../infra/security/jwt.service'
import { AppError } from '../shared/errors/app-error'
import { ERROR_CODES } from '../shared/errors/error-codes'
import { buildErrorResponse } from '../shared/http/error-response'
import { logger } from '../shared/logger/logger'
import { requestLogger } from '../shared/middlewares/request-logger'
import { responseEnvelope } from '../shared/middlewares/response-envelope'
import packageJson from '../../package.json'

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
  const app = new OpenAPIHono<{ Variables: { authUser: JwtPayload; userId: string } }>()
  const apiVersion = packageJson.version
  const startedAt = Date.now()
  const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://localhost:5173',
  ])
  const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? '60000')
  const rateLimitMaxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? '120')
  const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
  const docsSessionCookieName = 'docs_session'
  const docsSessionTtlMs = 2 * 60 * 60 * 1000
  const docsSessionStore = new Map<string, number>()
  app.openAPIRegistry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  })

  app.use(prettyJSON())
  app.use('*', cors({
    origin: (origin) => {
      if (!origin) {
        return ''
      }

      return allowedOrigins.has(origin) ? origin : ''
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }))
  app.use('*', requestLogger)
  app.use('*', responseEnvelope)
  app.use('*', async (c, next) => {
    const forwardedFor = c.req.header('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'unknown'
    const now = Date.now()
    const current = rateLimitStore.get(clientIp)

    if (!current || current.resetAt <= now) {
      rateLimitStore.set(clientIp, {
        count: 1,
        resetAt: now + rateLimitWindowMs,
      })
      await next()
      return
    }

    if (current.count >= rateLimitMaxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000)
      c.header('Retry-After', String(retryAfterSeconds))
      return c.json(
        buildErrorResponse(429, 'Muitas requisições. Tente novamente em instantes.', [
          {
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            message: 'Limite de requisições por IP excedido',
          },
        ]),
        429,
      )
    }

    current.count += 1
    rateLimitStore.set(clientIp, current)
    await next()
  })

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
  app.route('/api', revenueRoutes)

  const swaggerUser = process.env.SWAGGER_USER
  const swaggerPass = process.env.SWAGGER_PASS
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction && (!swaggerUser || !swaggerPass)) {
    console.error("Swagger não ativado, env de desenvolvimento")
  }

  const docsAuthGuard = async (c: Context, next: Next) => {
    if (!swaggerUser || !swaggerPass) {
      await next()
      return
    }

    if (c.req.path === '/docs/login') {
      await next()
      return
    }

    const token = getCookie(c, docsSessionCookieName)
    const expiresAt = token ? docsSessionStore.get(token) : undefined
    if (token && expiresAt && expiresAt > Date.now()) {
      await next()
      return
    }

    if (token) {
      docsSessionStore.delete(token)
    }

    return c.redirect('/docs/login')
  }

  app.use('/docs', docsAuthGuard)
  app.use('/docs/*', docsAuthGuard)

  app.use('/openapi.json', async (c, next) => {
    if (!swaggerUser || !swaggerPass) {
      await next()
      return
    }

    const token = getCookie(c, docsSessionCookieName)
    const expiresAt = token ? docsSessionStore.get(token) : undefined
    if (token && expiresAt && expiresAt > Date.now()) {
      await next()
      return
    }

    if (token) {
      docsSessionStore.delete(token)
    }

    return c.json(
      buildErrorResponse(401, 'Não autenticado para acessar a documentação.', [
        {
          code: ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Faça login para acessar a documentação',
        },
      ]),
      401,
    )
  })

  app.doc('/openapi.json', {
    openapi: '3.0.0',
    servers: [
      {
        url: '/',
        description: 'Current server',
      },
    ],
    info: {
      title: 'i-revenue API',
      version: apiVersion,
      description: 'Documentação da API',
    },
  })

  app.get('/docs/login', (c) => {
    const error = c.req.query('error') === '1'

    return c.html(`<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Login - i-revenue API Docs</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #f7fafc, #e2e8f0);
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        color: #1f2937;
      }
      .card {
        width: min(92vw, 420px);
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.15);
        padding: 24px;
      }
      h1 {
        margin: 0 0 8px 0;
        font-size: 24px;
      }
      p {
        margin: 0 0 20px 0;
        color: #4b5563;
      }
      label {
        display: block;
        margin: 12px 0 6px 0;
        font-weight: 600;
      }
      input {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
      }
      button {
        width: 100%;
        margin-top: 16px;
        border: 0;
        border-radius: 8px;
        padding: 11px 12px;
        cursor: pointer;
        background: #111827;
        color: #ffffff;
        font-weight: 700;
      }
      .error {
        margin-top: 8px;
        color: #b91c1c;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Acesso à documentação</h1>
      <p>Faça login para abrir o Swagger da API.</p>
      <form method="post" action="/docs/login">
        <label for="username">Usuário</label>
        <input id="username" name="username" type="text" autocomplete="username" required />
        <label for="password">Senha</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />
        <button type="submit">Entrar</button>
        ${error ? '<div class="error">Credenciais inválidas.</div>' : ''}
      </form>
    </main>
  </body>
</html>`)
  })

  app.post('/docs/login', async (c) => {
    if (!swaggerUser || !swaggerPass) {
      return c.redirect('/docs')
    }

    const body = await c.req.parseBody()
    const username = typeof body.username === 'string' ? body.username : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (username !== swaggerUser || password !== swaggerPass) {
      return c.redirect('/docs/login?error=1')
    }

    const sessionToken = crypto.randomUUID()
    docsSessionStore.set(sessionToken, Date.now() + docsSessionTtlMs)

    setCookie(c, docsSessionCookieName, sessionToken, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: isProduction,
      path: '/',
      maxAge: Math.floor(docsSessionTtlMs / 1000),
    })

    return c.redirect('/docs')
  })

  app.post('/docs/logout', (c) => {
    const token = getCookie(c, docsSessionCookieName)
    if (token) {
      docsSessionStore.delete(token)
    }
    deleteCookie(c, docsSessionCookieName, { path: '/' })
    return c.redirect('/docs/login')
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
    if (error instanceof HTTPException) {
      const status = error.status as ContentfulStatusCode
      const response = error.getResponse()

      response.headers.forEach((value, key) => c.header(key, value))

      logger.warn('request.http_exception', {
        'http.request.method': c.req.method,
        'url.path': c.req.path,
        'http.response.status_code': error.status,
        message: error.message,
      })

      return c.json(
        buildErrorResponse(status, error.message, [{ code: ERROR_CODES.APP_ERROR, message: error.message }]),
        status,
      )
    }

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
