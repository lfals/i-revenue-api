import { Hono } from 'hono'
import { zValidator } from '../../shared/http/zod-validator'
import { AuthController } from './auth.controller'
import { AuthRepository } from './auth.repository'
import { loginSchema, registerSchema } from './auth.schemas'
import { AuthService } from './auth.service'

const authRoutes = new Hono()

const authRepository = new AuthRepository()
const authService = new AuthService(authRepository)
const authController = new AuthController(authService)

authRoutes.post('/register', zValidator('json', registerSchema), (c) => authController.register(c))
authRoutes.post('/login', zValidator('json', loginSchema), (c) => authController.login(c))

export default authRoutes
