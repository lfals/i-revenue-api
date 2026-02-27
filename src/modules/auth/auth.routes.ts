import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { AuthController } from './auth.controller'
import { AuthRepository } from './auth.repository'
import {
  errorResponseSchema,
  loginResponseSchema,
  loginSchema,
  registerResponseSchema,
  registerSchema,
  renewResponseSchema,
} from './auth.schemas'
import { AuthService } from './auth.service'

const authRoutes = new OpenAPIHono<{ Variables: { userId: string } }>()

const authRepository = new AuthRepository()
const authService = new AuthService(authRepository)
const authController = new AuthController(authService)

const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Auth'],
  summary: 'Registra um novo usuário',
  security: [],
  request: {
    body: {
      content: {
        'application/json': {
          schema: registerSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Usuário registrado com sucesso',
      content: {
        'application/json': {
          schema: registerResponseSchema,
          example: {
            success: true,
            status: 201,
            message: 'Usuário registrado com sucesso',
            data: {
              id: "f01d0190-7b66-4480-8fa3-3bbebaddb3cd",
              name: 'Felipe Santos',
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
    400: {
      description: 'Dados inválidos',
      content: {
        'application/json': {
          schema: errorResponseSchema,
          example: {
            success: false,
            status: 400,
            message: 'Dados inválidos',
            errors: [
              {
                code: 'too_small',
                message: 'Senha deve ter no mínimo 6 caracteres',
                path: 'password',
              },
            ],
          },
        },
      },
    },
    409: {
      description: 'Usuário ou e-mail já cadastrado',
      content: {
        'application/json': {
          schema: errorResponseSchema,
          example: {
            success: false,
            status: 409,
            message: 'Email já cadastrado',
            errors: [
              {
                code: 'EMAIL_ALREADY_EXISTS',
                message: 'Email já cadastrado',
              },
            ],
          },
        },
      },
    },
  },
})

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Autentica um usuário',
  security: [],
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login realizado com sucesso',
      content: {
        'application/json': {
          schema: loginResponseSchema,
          example: {
            success: true,
            status: 200,
            message: 'Usuário autenticado com sucesso',
            data: {
              id: "f01d0190-7b66-4480-8fa3-3bbebaddb3cd",
              name: 'Felipe Santos',
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
    400: {
      description: 'Dados inválidos',
      content: {
        'application/json': {
          schema: errorResponseSchema,
          example: {
            success: false,
            status: 400,
            message: 'Dados inválidos',
            errors: [
              {
                code: 'invalid_string',
                path: 'email',
              },
            ],
          },
        },
      },
    },
    401: {
      description: 'Credenciais inválidas',
      content: {
        'application/json': {
          schema: errorResponseSchema,
          example: {
            success: false,
            status: 401,
            message: 'Email e ou senha incorretos',
            errors: [
              {
                code: 'INVALID_CREDENTIALS',
              },
            ],
          },
        },
      },
    },
  },
})

const renewRoute = createRoute({
  method: 'post',
  path: '/renew',
  tags: ['Auth'],
  summary: 'Renova o access token usando refresh token em cookie HttpOnly',
  responses: {
    200: {
      description: 'Token renovado com sucesso',
      content: {
        'application/json': {
          schema: renewResponseSchema,
          example: {
            success: true,
            status: 200,
            message: 'Token renovado com sucesso',
            data: {
              id: "f01d0190-7b66-4480-8fa3-3bbebaddb3cd",
              name: 'Felipe Santos',
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
    401: {
      description: 'Refresh token ausente ou inválido',
      content: {
        'application/json': {
          schema: errorResponseSchema,
          example: {
            success: false,
            status: 401,
            errors: [
              {
                code: 'invalid_refresh_token',
                message: 'Refresh token inválido',
              },
            ],
          },
        },
      },
    },
  },
})

authRoutes.openapi(registerRoute, (c) => authController.register(c, c.req.valid('json')))
authRoutes.openapi(loginRoute, (c) => authController.login(c, c.req.valid('json')))
authRoutes.openapi(renewRoute, (c) => authController.renew(c))

export default authRoutes
