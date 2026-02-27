import type { Context } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { env } from '../../config/env'
import { getRefreshTokenTtlSeconds } from '../../infra/security/jwt.service'
import type { LoginInput, RegisterInput } from './auth.schemas'
import { AuthService } from './auth.service'

const refreshTokenCookieName = 'refresh_token'
type AuthContext = Context<{ Variables: { userId: string } }>

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
  constructor(private readonly authService: AuthService) { }

  async register(c: Context, payload: RegisterInput) {
    const response = await this.authService.register(payload)
    setRefreshTokenCookie(c, response.refreshToken)

    return c.json(
      {
        success: true,
        status: 201,
        message: 'Usuário registrado com sucesso',
        data: {
          ...response.user,
        },
      },
      201,
    )
  }

  async login(c: AuthContext, payload: LoginInput) {
    const response = await this.authService.login(payload)
    setRefreshTokenCookie(c, response.refreshToken)
    c.set('userId', response.id)

    return c.json(
      {
        success: true,
        status: 200,
        message: 'Usuário autenticado com sucesso',
        data: {
          id: response.id,
          name: response.name,
          token: response.token,
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
          id: response.id,
          name: response.name,
          token: response.token,
        },
      },
      200,
    )
  }
}

export { refreshTokenCookieName }
