import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { env } from '../../config/env'
import { getRefreshTokenTtlSeconds } from '../../infra/security/jwt.service'
import type { LoginInput, RegisterInput } from './auth.schemas'
import { AuthService } from './auth.service'

const refreshTokenCookieName = 'refresh_token'

function setRefreshTokenCookie(c: Context, refreshToken: string) {
  setCookie(c, refreshTokenCookieName, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Strict',
    path: '/auth',
    maxAge: getRefreshTokenTtlSeconds(),
  })
}

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(c: Context, payload: RegisterInput) {
    const response = await this.authService.register(payload)
    setRefreshTokenCookie(c, response.refreshToken)

    return c.json(
      {
        success: true,
        status: 201,
        message: 'Usuário registrado com sucesso',
        data: {
          message: response.message,
          user: response.user,
        },
      },
      201,
    )
  }

  async login(c: Context, payload: LoginInput) {
    const response = await this.authService.login(payload)
    setRefreshTokenCookie(c, response.refreshToken)

    return c.json(
      {
        success: true,
        status: 200,
        message: 'Usuário autenticado com sucesso',
        data: {
          message: response.message,
          id: response.id,
          name: response.name,
          accessToken: response.accessToken,
        },
      },
      200,
    )
  }

  async renew(c: Context) {
    const refreshToken = getCookie(c, refreshTokenCookieName) ?? ''
    const response = await this.authService.renew(refreshToken)
    setRefreshTokenCookie(c, response.refreshToken)

    return c.json(
      {
        success: true,
        status: 200,
        message: 'Token renovado com sucesso',
        data: {
          message: response.message,
          id: response.id,
          name: response.name,
          accessToken: response.accessToken,
        },
      },
      200,
    )
  }
}

export { refreshTokenCookieName }
