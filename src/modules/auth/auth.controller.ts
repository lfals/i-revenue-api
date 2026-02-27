import type { Context } from 'hono'
import type { LoginInput, RegisterInput } from './auth.schemas'
import { AuthService } from './auth.service'

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(c: Context, payload: RegisterInput) {
    const response = await this.authService.register(payload)
    return c.json(
      {
        success: true,
        status: 201,
        message: 'Usuário registrado com sucesso',
        data: response,
      },
      201,
    )
  }

  async login(c: Context, payload: LoginInput) {
    const response = await this.authService.login(payload)
    return c.json(
      {
        success: true,
        status: 200,
        message: 'Usuário autenticado com sucesso',
        data: response,
      },
      200,
    )
  }
}
