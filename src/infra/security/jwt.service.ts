import { sign, verify } from 'hono/jwt'
import { env } from '../../config/env'
import { AppError } from '../../shared/errors/app-error'
import { logger } from '../../shared/logger/logger'

type JwtPayload = {
  id: string
  name: string
}

const algorithm = 'HS256'

export async function generateJWT(payload: JwtPayload): Promise<string> {
  const data = {
    ...payload,
    sub: payload.id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  }

  try {
    return await sign(data, env.JWT_SECRET, algorithm)
  } catch (error) {
    logger.error('auth.jwt.sign_failed', {
      error: error instanceof Error ? error.message : 'unknown_error',
    })
    throw new AppError(500, 'Erro interno ao gerar token', 'token_generation_failed')
  }
}

export async function validateJWT(token: string): Promise<boolean> {
  try {
    await verify(token, env.JWT_SECRET, algorithm)
    return true
  } catch (error) {
    logger.warn('auth.jwt.invalid_token', {
      error: error instanceof Error ? error.message : 'invalid_token',
    })

    throw new AppError(
      401,
      'Usuário não autenticado',
      'invalid_token',
      [{ code: 'invalid_token', message: 'Usuário não autenticado' }],
      { 'WWW-Authenticate': 'Bearer error="invalid_token"' },
    )
  }
}
