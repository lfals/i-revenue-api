import { generateJWT } from '../../infra/security/jwt.service'
import { AppError } from '../../shared/errors/app-error'
import { logger } from '../../shared/logger/logger'
import type { LoginInput, RegisterInput } from './auth.schemas'
import { AuthRepository } from './auth.repository'

export class AuthService {
  constructor(private readonly authRepository: AuthRepository) { }

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
          'user_already_exists',
          [{ code: 'user_already_exists', message: 'Usuário já existe' }],
        )
      }

      const token = await generateJWT({
        id: createdUser.id,
        name: createdUser.name,
      })

      return {
        message: 'Usuário criado com sucesso',
        user: {
          ...createdUser,
          token,
        },
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
          'email_already_exists',
          [{ code: 'email_already_exists', message: 'Email já cadastrado' }],
        )
      }

      logger.error('auth.register.unexpected_error', { error: message })
      throw new AppError(500, 'Erro interno ao criar usuário', 'register_failed')
    }
  }

  async login(input: LoginInput) {
    try {
      const user = await this.authRepository.findUserByEmail(input.email)

      if (!user) {
        throw new AppError(401, 'Email e ou senha incorretos', 'invalid_credentials')
      }

      const passwordIsValid = await Bun.password.verify(input.password, user.password)
      if (!passwordIsValid) {
        throw new AppError(401, 'Email e ou senha incorretos', 'invalid_credentials')
      }

      const token = await generateJWT({
        id: user.id,
        name: user.name,
      })

      return {
        message: 'Login realizado com sucesso',
        id: user.id,
        name: user.name,
        token,
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      logger.error('auth.login.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
      })
      throw new AppError(500, 'Erro interno ao autenticar usuário', 'login_failed')
    }
  }
}
