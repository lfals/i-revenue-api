import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test'
import { ERROR_CODES } from '../shared/errors/error-codes.js'

type CreateAppFn = () => {
  request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

type GenerateJWTFn = (payload: { id: string; name: string }) => Promise<string>
type GenerateRefreshTokenFn = (payload: { id: string; name: string }) => Promise<string>

let createApp: CreateAppFn
let generateJWT: GenerateJWTFn
let generateRefreshToken: GenerateRefreshTokenFn
const originalNodeEnv = process.env.NODE_ENV
const originalSwaggerUser = process.env.SWAGGER_USER
const originalSwaggerPass = process.env.SWAGGER_PASS
const originalRateLimitWindowMs = process.env.RATE_LIMIT_WINDOW_MS
const originalRateLimitMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv
  process.env.SWAGGER_USER = originalSwaggerUser
  process.env.SWAGGER_PASS = originalSwaggerPass
  process.env.RATE_LIMIT_WINDOW_MS = originalRateLimitWindowMs
  process.env.RATE_LIMIT_MAX_REQUESTS = originalRateLimitMaxRequests
})

beforeAll(async () => {
  mock.module('../shared/logger/logger.js', () => ({
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  }))

  const appModule = await import('./create-app.js')
  const jwtModule = await import('../infra/security/jwt.service.js')

  createApp = appModule.createApp as CreateAppFn
  generateJWT = jwtModule.generateJWT as GenerateJWTFn
  generateRefreshToken = jwtModule.generateRefreshToken as GenerateRefreshTokenFn
})

describe('Secure routes auth context', () => {
  it('retorna 401 quando header authorization nao for enviado', async () => {
    const app = createApp()
    const response = await app.request('http://localhost/api/page')
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      errors: Array<{ code: string; message: string }>
    }

    expect(response.status).toBe(401)
    expect(body.success).toBeFalse()
    expect(body.status).toBe(401)
    expect(body.message).toBe('Bearer é obrigatório')
    expect(body.errors[0]?.code).toBe(ERROR_CODES.MISSING_TOKEN)
  })

  it('retorna 401 quando token for invalido', async () => {
    const app = createApp()
    const response = await app.request('http://localhost/api/page', {
      headers: {
        authorization: 'Bearer token-invalido',
      },
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      errors: Array<{ code: string; message: string }>
    }

    expect(response.status).toBe(401)
    expect(body.success).toBeFalse()
    expect(body.status).toBe(401)
    expect(body.message).toBe('Usuário não autenticado')
    expect(body.errors[0]?.code).toBe(ERROR_CODES.INVALID_TOKEN)
  })

  it('disponibiliza authUser no contexto da rota segura', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'user-1',
      name: 'Felps',
    })

    const response = await app.request('http://localhost/api/page', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      data: {
        message: string
        authUser: {
          id: string
          name: string
        }
      }
    }

    expect(response.status).toBe(200)
    expect(body.success).toBeTrue()
    expect(body.status).toBe(200)
    expect(body.message).toBe('Sucesso')
    expect(body.data.message).toBe('You are authorized')
    expect(body.data.authUser.id).toBe('user-1')
    expect(body.data.authUser.name).toBe('Felps')
  })

  it('retorna dashboard vazio quando autenticado', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'user-2',
      name: 'Felps',
    })

    const response = await app.request('http://localhost/api/dashboard', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      data: unknown[]
    }

    expect(response.status).toBe(200)
    expect(body.success).toBeTrue()
    expect(body.status).toBe(200)
    expect(body.message).toBe('Sucesso')
    expect(body.data).toEqual([])
  })

  it('retorna dashboard vazio no POST quando autenticado', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'user-3',
      name: 'Felps',
    })

    const response = await app.request('http://localhost/api/dashboard', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      data: unknown[]
    }

    expect(response.status).toBe(200)
    expect(body.success).toBeTrue()
    expect(body.status).toBe(200)
    expect(body.message).toBe('Sucesso')
    expect(body.data).toEqual([])
  })

  it('retorna dashboard vazio no PUT quando autenticado', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'user-4',
      name: 'Felps',
    })

    const response = await app.request('http://localhost/api/dashboard', {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      data: unknown[]
    }

    expect(response.status).toBe(200)
    expect(body.success).toBeTrue()
    expect(body.status).toBe(200)
    expect(body.message).toBe('Sucesso')
    expect(body.data).toEqual([])
  })

  it('retorna dashboard vazio no PATCH quando autenticado', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'user-5',
      name: 'Felps',
    })

    const response = await app.request('http://localhost/api/dashboard', {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      data: unknown[]
    }

    expect(response.status).toBe(200)
    expect(body.success).toBeTrue()
    expect(body.status).toBe(200)
    expect(body.message).toBe('Sucesso')
    expect(body.data).toEqual([])
  })

  it('retorna dashboard vazio no DELETE quando autenticado', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'user-6',
      name: 'Felps',
    })

    const response = await app.request('http://localhost/api/dashboard', {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      data: unknown[]
    }

    expect(response.status).toBe(200)
    expect(body.success).toBeTrue()
    expect(body.status).toBe(200)
    expect(body.message).toBe('Sucesso')
    expect(body.data).toEqual([])
  })

  it('retorna 401 para dashboard em todos os metodos sem token', async () => {
    const app = createApp()
    const methods: RequestInit['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

    for (const method of methods) {
      const response = await app.request('http://localhost/api/dashboard', { method })
      const body = (await response.json()) as {
        success: boolean
        status: number
        message: string
        errors: Array<{ code: string; message: string }>
      }

      expect(response.status).toBe(401)
      expect(body.success).toBeFalse()
      expect(body.status).toBe(401)
      expect(body.message).toBe('Bearer é obrigatório')
      expect(body.errors[0]?.code).toBe(ERROR_CODES.MISSING_TOKEN)
    }
  })
})

describe('Public auth routes', () => {
  it('nao exige bearer token para register', async () => {
    const app = createApp()
    const response = await app.request('http://localhost/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'A',
        email: 'email-invalido',
        password: '123',
      }),
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      errors: Array<{ code: string; message?: string; path?: string }>
    }

    expect(response.status).toBe(400)
    expect(body.success).toBeFalse()
    expect(body.status).toBe(400)
    expect(body.message).not.toBe('Bearer é obrigatório')
    expect(body.errors.length).toBeGreaterThan(0)
  })

  it('nao exige bearer token para login', async () => {
    const app = createApp()
    const response = await app.request('http://localhost/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'email-invalido',
        password: '',
      }),
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      errors: Array<{ code: string; message?: string; path?: string }>
    }

    expect(response.status).toBe(400)
    expect(body.success).toBeFalse()
    expect(body.status).toBe(400)
    expect(body.message).not.toBe('Bearer é obrigatório')
    expect(body.errors.length).toBeGreaterThan(0)
  })
})

describe('CORS', () => {
  it('permite requisicoes de http://localhost:5173 com credentials', async () => {
    const app = createApp()
    const response = await app.request('http://localhost/health', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'GET',
      },
    })

    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
  })
})

describe('Auth renew endpoint', () => {
  it('renova access token quando refresh token estiver presente no cookie', async () => {
    const app = createApp()
    const refreshToken = await generateRefreshToken({
      id: 'user-renew',
      name: 'Felps',
    })

    const response = await app.request('http://localhost/auth/renew', {
      method: 'POST',
      headers: {
        cookie: `refresh_token=${refreshToken}`,
      },
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      data: {
        message: string
        id: string
        name: string
        token: string
      }
    }

    expect(response.status).toBe(200)
    expect(body.success).toBeTrue()
    expect(body.status).toBe(200)
    expect(body.message).toBe('Token renovado com sucesso')
    expect(body.data.id).toBe('user-renew')
    expect(body.data.name).toBe('Felps')
    expect(typeof body.data.token).toBe('string')
    expect(body.data.token.length).toBeGreaterThan(10)
    expect(response.headers.get('set-cookie')).toContain('refresh_token=')
  })

  it('retorna 401 quando refresh token nao for enviado', async () => {
    const app = createApp()
    const response = await app.request('http://localhost/auth/renew', {
      method: 'POST',
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      errors: Array<{ code: string; message: string }>
    }

    expect(response.status).toBe(401)
    expect(body.success).toBeFalse()
    expect(body.status).toBe(401)
    expect(body.message).toBe('Refresh token é obrigatório')
    expect(body.errors[0]?.code).toBe(ERROR_CODES.MISSING_REFRESH_TOKEN)
  })
})

describe('Swagger login', () => {
  it('redireciona para /docs/login quando docs estiver protegido', async () => {
    process.env.SWAGGER_USER = 'admin'
    process.env.SWAGGER_PASS = 'secret'
    const app = createApp()

    const response = await app.request('http://localhost/docs')

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/docs/login')
  })

  it('faz login na tela e libera o acesso ao /docs e /openapi.json', async () => {
    process.env.SWAGGER_USER = 'admin'
    process.env.SWAGGER_PASS = 'secret'
    const app = createApp()

    const loginResponse = await app.request('http://localhost/docs/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: 'username=admin&password=secret',
    })

    expect(loginResponse.status).toBe(302)
    expect(loginResponse.headers.get('Location')).toBe('/docs')
    const setCookie = loginResponse.headers.get('set-cookie')
    expect(setCookie).toContain('docs_session=')

    const docsResponse = await app.request('http://localhost/docs', {
      headers: {
        cookie: setCookie ?? '',
      },
    })
    expect(docsResponse.status).toBe(200)

    const openapiResponse = await app.request('http://localhost/openapi.json', {
      headers: {
        cookie: setCookie ?? '',
      },
    })
    expect(openapiResponse.status).toBe(200)
  })
})

describe('Rate limit', () => {
  it('retorna 429 quando limite de requisições por IP é excedido', async () => {
    process.env.RATE_LIMIT_WINDOW_MS = '60000'
    process.env.RATE_LIMIT_MAX_REQUESTS = '2'
    const app = createApp()

    const first = await app.request('http://localhost/health', {
      headers: {
        'x-forwarded-for': '203.0.113.10',
      },
    })
    const second = await app.request('http://localhost/health', {
      headers: {
        'x-forwarded-for': '203.0.113.10',
      },
    })
    const third = await app.request('http://localhost/health', {
      headers: {
        'x-forwarded-for': '203.0.113.10',
      },
    })
    const body = (await third.json()) as {
      success: boolean
      status: number
      message: string
      errors: Array<{ code: string; message: string }>
    }

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(third.status).toBe(429)
    expect(third.headers.get('Retry-After')).toBeString()
    expect(body.success).toBeFalse()
    expect(body.status).toBe(429)
    expect(body.errors[0]?.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED)
  })
})
