import { sign, verify } from 'hono/jwt'
import { env } from '../../config/env'
import { AppError } from '../../shared/errors/app-error'
import { ERROR_CODES } from '../../shared/errors/error-codes'
import { logger } from '../../shared/logger/logger'

export type JwtPayload = {
  id: string
  name: string
}

type TokenType = 'access' | 'refresh'

type BaseTokenPayload = JwtPayload & {
  type: TokenType
  sub: string
  exp: number
  iat: number
}

const algorithm = 'HS256'
const accessTokenTtlSeconds = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? '3600')
const refreshTokenTtlSeconds = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? `${60 * 60 * 24 * 30}`)
const refreshTokenSecret = env.REFRESH_JWT_SECRET ?? env.JWT_SECRET

function buildInvalidTokenError(
  code: typeof ERROR_CODES.INVALID_TOKEN | typeof ERROR_CODES.INVALID_REFRESH_TOKEN,
) {
  const message = code === ERROR_CODES.INVALID_REFRESH_TOKEN
    ? 'Refresh token inválido'
    : 'Usuário não autenticado'

  return new AppError(
    401,
    message,
    code,
    [{ code, message }],
    { 'WWW-Authenticate': `Bearer error="${code}"` },
  )
}

async function signToken(
  payload: JwtPayload,
  options: { type: TokenType; ttlSeconds: number; secret: string },
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000)

  try {
    return await sign(
      {
        ...payload,
        type: options.type,
        sub: payload.id,
        iat: issuedAt,
        exp: issuedAt + options.ttlSeconds,
      },
      options.secret,
      algorithm,
    )
  } catch (error) {
    logger.error('auth.jwt.sign_failed', {
      tokenType: options.type,
      error: error instanceof Error ? error.message : 'unknown_error',
    })
    throw new AppError(500, 'Erro interno ao gerar token', ERROR_CODES.TOKEN_GENERATION_FAILED)
  }
}

async function verifyToken(
  token: string,
  options: {
    expectedType: TokenType
    secret: string
    errorCode: typeof ERROR_CODES.INVALID_TOKEN | typeof ERROR_CODES.INVALID_REFRESH_TOKEN
  },
): Promise<BaseTokenPayload> {
  try {
    const payload = await verify(token, options.secret, algorithm)

    if (
      typeof payload.id !== 'string'
      || typeof payload.name !== 'string'
      || typeof payload.sub !== 'string'
      || payload.sub !== payload.id
      || payload.type !== options.expectedType
      || typeof payload.exp !== 'number'
      || typeof payload.iat !== 'number'
    ) {
      throw buildInvalidTokenError(options.errorCode)
    }

    return payload as BaseTokenPayload
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    logger.warn('auth.jwt.invalid_token', {
      tokenType: options.expectedType,
      error: error instanceof Error ? error.message : 'invalid_token',
    })

    throw buildInvalidTokenError(options.errorCode)
  }
}

export async function generateJWT(payload: JwtPayload): Promise<string> {
  return generateAccessToken(payload)
}

export async function generateAccessToken(payload: JwtPayload): Promise<string> {
  return signToken(payload, {
    type: 'access',
    ttlSeconds: accessTokenTtlSeconds,
    secret: env.JWT_SECRET,
  })
}

export async function generateRefreshToken(payload: JwtPayload): Promise<string> {
  return signToken(payload, {
    type: 'refresh',
    ttlSeconds: refreshTokenTtlSeconds,
    secret: refreshTokenSecret,
  })
}

export async function getUserFromJWT(token: string): Promise<JwtPayload> {
  const payload = await verifyToken(token, {
    expectedType: 'access',
    secret: env.JWT_SECRET,
    errorCode: ERROR_CODES.INVALID_TOKEN,
  })

  return {
    id: payload.id,
    name: payload.name,
  }
}

export async function getUserFromRefreshToken(token: string): Promise<JwtPayload> {
  const payload = await verifyToken(token, {
    expectedType: 'refresh',
    secret: refreshTokenSecret,
    errorCode: ERROR_CODES.INVALID_REFRESH_TOKEN,
  })

  return {
    id: payload.id,
    name: payload.name,
  }
}

export async function validateJWT(token: string): Promise<boolean> {
  await getUserFromJWT(token)
  return true
}

export function getRefreshTokenTtlSeconds() {
  return refreshTokenTtlSeconds
}
