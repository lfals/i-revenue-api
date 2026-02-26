import type { Context } from 'hono'
import type { LoginInput, RegisterInput } from './auth.schemas'
import { AuthService } from './auth.service'

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async register(c: Context) {
    const payload = (await c.req.json()) as RegisterInput
    const response = await this.authService.register(payload)
    return c.json(response, 201)
  }

  async login(c: Context) {
    const payload = (await c.req.json()) as LoginInput
    const response = await this.authService.login(payload)
    return c.json(response, 200)
  }
}
