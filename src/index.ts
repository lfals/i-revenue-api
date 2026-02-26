import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { HTTPException } from 'hono/http-exception'
import auth from './routes/auth'
import { drizzle } from 'drizzle-orm/libsql';
import { prettyJSON } from 'hono/pretty-json'
import { buildErrorResponse } from './utils/error-response.util'
import { responseEnvelope } from './middlewares/response-envelope'
import { requestLogger } from './middlewares/request-logger'
import { logger } from './utils/logger.util'

import { createClient } from "@libsql/client/node";
import { validateJWT } from './utils/jwt.util';

const app = new Hono()
const startedAt = Date.now()

app.use(prettyJSON()) // With options: prettyJSON({ space: 4 })
app.use('*', requestLogger)
app.use('*', responseEnvelope)

const client = createClient({
  url: process.env.LOCAL_DB!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  syncUrl: process.env.TURSO_DATABASE_URL!,
  syncInterval: 15, // - https://docs.turso.tech/sdk/ts/reference#periodic-sync,
  encryptionKey: process.env.SECRET
});

export const db = drizzle(client);

app.route('/auth', auth)

app.notFound((c) => {
  const message = 'Rota não encontrada'
  return c.json(
    buildErrorResponse(404, message, [{ code: 'not_found', message }]),
    404,
  )
})

app.onError(async (error, c) => {
  if (error instanceof HTTPException) {
    const status = error.status
    const exceptionResponse = error.getResponse()
    for (const [key, value] of exceptionResponse.headers.entries()) {
      c.header(key, value)
    }
    const defaultMessage = 'Erro na requisição'
    let exceptionMessage = error.message

    if (!exceptionMessage) {
      const responseBody = await exceptionResponse.clone().text()
      exceptionMessage = responseBody || defaultMessage
    }

    const isVerifyTokenError =
      status === 401 && exceptionMessage === 'Usuário não autenticado'
    const message = isVerifyTokenError ? 'Usuário não autenticado' : exceptionMessage
    const errorDetail = isVerifyTokenError ? 'Usuário não autenticado' : exceptionMessage

    logger.warn('request.http_exception', {
      'http.request.method': c.req.method,
      'url.path': c.req.path,
      'http.response.status_code': status,
      message: exceptionMessage,
    })

    return c.json(
      buildErrorResponse(status, message, [{ code: 'http_exception', message: errorDetail }]),
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
  return c.json(
    buildErrorResponse(500, message, [{ code: 'internal_error', message }]),
    500,
  )
})


app.get('/health', (c) => {
  return c.json({
    message: 'Serviço disponível',
    uptime: `${Math.floor((Date.now() - startedAt) / 1000)}s`,
  }, 200)
})

app.use('/api/*', bearerAuth({
  verifyToken: validateJWT,
  noAuthenticationHeader: {
    message: 'Bearer é obrigatório',
  },
}))

app.get('/api/page', (c) => {
  return c.json({ message: 'You are authorized' }, 200)
})

export default app
