import { sign, verify } from 'hono/jwt'
import { env } from '../../config/env'
import { AppError } from '../../shared/errors/app-error'
import { ERROR_CODES } from '../../shared/errors/error-codes'
import { logger } from '../../shared/logger/logger'

export type JwtPayload = {
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
    throw new AppError(500, 'Erro interno ao gerar token', ERROR_CODES.TOKEN_GENERATION_FAILED)
  }
}

export async function getUserFromJWT(token: string): Promise<JwtPayload> {
  try {
    const payload = await verify(token, env.JWT_SECRET, algorithm)

    if (typeof payload.id !== 'string' || typeof payload.name !== 'string') {
      throw new AppError(
        401,
        'Usuário não autenticado',
        ERROR_CODES.INVALID_TOKEN,
        [{ code: ERROR_CODES.INVALID_TOKEN, message: 'Usuário não autenticado' }],
        { 'WWW-Authenticate': `Bearer error="${ERROR_CODES.INVALID_TOKEN}"` },
      )
    }

    return {
      id: payload.id,
      name: payload.name,
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    logger.warn('auth.jwt.invalid_token', {
      error: error instanceof Error ? error.message : 'invalid_token',
    })

    throw new AppError(
      401,
      'Usuário não autenticado',
      ERROR_CODES.INVALID_TOKEN,
      [{ code: ERROR_CODES.INVALID_TOKEN, message: 'Usuário não autenticado' }],
      { 'WWW-Authenticate': `Bearer error="${ERROR_CODES.INVALID_TOKEN}"` },
    )
  }
}

export async function validateJWT(token: string): Promise<boolean> {
  await getUserFromJWT(token)
  return true
}
