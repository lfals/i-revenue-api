import {
  generateAccessToken,
  generateRefreshToken,
  getUserFromRefreshToken,
} from '../../infra/security/jwt.service'
import { AppError } from '../../shared/errors/app-error'
import { ERROR_CODES } from '../../shared/errors/error-codes'
import { logger } from '../../shared/logger/logger'
import type { LoginInput, RegisterInput } from './auth.schemas'
import { AuthRepository } from './auth.repository'

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) { }

  private async issueTokens(payload: { id: string; name: string }) {
    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(payload),
      generateRefreshToken(payload),
    ])

    return {
      accessToken,
      refreshToken,
    }
  }

  async register(input: RegisterInput) {
    try {
      const hash = await Bun.password.hash(input.password)
      const createdUser = await this.authRepository.createUser({
        ...input,
        password: hash,
      })

      if (!createdUser) {
        throw new AppError(
          409,
          'Usuário já existe',
          ERROR_CODES.USER_ALREADY_EXISTS,
          [{ code: ERROR_CODES.USER_ALREADY_EXISTS, message: 'Usuário já existe' }],
        )
      }

      const tokens = await this.issueTokens({
        id: createdUser.id,
        name: createdUser.name,
      })

      return {
        message: 'Usuário criado com sucesso',
        user: {
          ...createdUser,
          accessToken: tokens.accessToken,
        },
        refreshToken: tokens.refreshToken,
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      const message = error instanceof Error ? error.message : 'unknown_error'

      if (message.includes('UNIQUE') || message.includes('unique')) {
        throw new AppError(
          409,
          'Email já cadastrado',
          ERROR_CODES.EMAIL_ALREADY_EXISTS,
          [{ code: ERROR_CODES.EMAIL_ALREADY_EXISTS, message: 'Email já cadastrado' }],
        )
      }

      logger.error('auth.register.unexpected_error', { error: message })
      throw new AppError(500, 'Erro interno ao criar usuário', ERROR_CODES.REGISTER_FAILED)
    }
  }

  async login(input: LoginInput) {
    try {
      const user = await this.authRepository.findUserByEmail(input.email)

      if (!user) {
        throw new AppError(401, 'Email e ou senha incorretos', ERROR_CODES.INVALID_CREDENTIALS)
      }

      const passwordIsValid = await Bun.password.verify(input.password, user.password)
      if (!passwordIsValid) {
        throw new AppError(401, 'Email e ou senha incorretos', ERROR_CODES.INVALID_CREDENTIALS)
      }

      const tokens = await this.issueTokens({
        id: user.id,
        name: user.name,
      })

      return {
        message: 'Login realizado com sucesso',
        id: user.id,
        name: user.name,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      logger.error('auth.login.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
      })
      throw new AppError(500, 'Erro interno ao autenticar usuário', ERROR_CODES.LOGIN_FAILED)
    }
  }

  async renew(refreshToken: string) {
    try {
      if (!refreshToken) {
        throw new AppError(
          401,
          'Refresh token é obrigatório',
          ERROR_CODES.MISSING_REFRESH_TOKEN,
          [{ code: ERROR_CODES.MISSING_REFRESH_TOKEN, message: 'Refresh token é obrigatório' }],
          { 'WWW-Authenticate': `Bearer error="${ERROR_CODES.MISSING_REFRESH_TOKEN}"` },
        )
      }

      const user = await getUserFromRefreshToken(refreshToken)
      const tokens = await this.issueTokens(user)

      return {
        message: 'Token renovado com sucesso',
        id: user.id,
        name: user.name,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      logger.error('auth.renew.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
      })
      throw new AppError(500, 'Erro interno ao renovar token', ERROR_CODES.TOKEN_RENEWAL_FAILED)
    }
  }
}
