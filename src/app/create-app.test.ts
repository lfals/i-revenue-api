import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test'
import { ERROR_CODES } from '../shared/errors/error-codes.js'

type CreateAppFn = () => {
  request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

type GenerateJWTFn = (payload: { id: string; name: string }) => Promise<string>
type GenerateRefreshTokenFn = (payload: { id: string; name: string }) => Promise<string>
type RevenueRecord = {
  id: string
  name: string
  type: 'clt' | 'pj' | 'freelance' | 'donation' | 'other'
  revenueAsRange: boolean
  min_revenue: number
  max_revenue: number | null
  cycle: 'monthly' | 'yearly'
  benefits: Array<{
    id: string
    revenue_id: string
    type: string
    value: number
  }>
  createdAt: string | null
  updatedAt: string | null
}

type RevenueListItem = Pick<RevenueRecord, 'id' | 'name' | 'type' | 'min_revenue' | 'max_revenue' | 'cycle'> & {
  benefits: Array<{
    type: string
    value: number
  }>
}
type RevenueDetailItem = Pick<RevenueRecord, 'name' | 'type' | 'min_revenue' | 'max_revenue' | 'cycle' | 'benefits'>

let createApp: CreateAppFn
let generateJWT: GenerateJWTFn
let generateRefreshToken: GenerateRefreshTokenFn
const revenueStore = new Map<string, RevenueRecord[]>()
let revenueSequence = 1
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
  revenueStore.clear()
  revenueSequence = 1
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

  mock.module('../infra/db/client.js', () => ({
    db: {},
  }))

  mock.module('../modules/revenue/revenue.repository.js', () => ({
    RevenueRepository: class RevenueRepository {
      async createRevenue(userId: string, input: Omit<RevenueRecord, 'id' | 'createdAt' | 'updatedAt'>) {
        const now = new Date().toISOString()
        const revenueId = `revenue-${revenueSequence++}`
        const record: RevenueRecord = {
          id: revenueId,
          ...input,
          benefits: input.benefits.map((benefit, index) => ({
            id: `benefit-${revenueId}-${index + 1}`,
            revenue_id: revenueId,
            type: benefit.type,
            value: benefit.value,
          })),
          createdAt: now,
          updatedAt: now,
        }
        const current = revenueStore.get(userId) ?? []
        current.unshift(record)
        revenueStore.set(userId, current)
        return record
      }

      async listRevenuesByUser(userId: string) {
        return [...(revenueStore.get(userId) ?? [])]
      }

      async findRevenueById(userId: string, id: string) {
        return revenueStore.get(userId)?.find((item) => item.id === id) ?? null
      }

      async updateRevenue(userId: string, id: string, input: Omit<RevenueRecord, 'id' | 'createdAt' | 'updatedAt'>) {
        const current = revenueStore.get(userId) ?? []
        const index = current.findIndex((item) => item.id === id)

        if (index === -1) {
          return null
        }

        const updated: RevenueRecord = {
          ...current[index],
          ...input,
          benefits: input.benefits.map((benefit, benefitIndex) => ({
            id: `benefit-${id}-${benefitIndex + 1}`,
            revenue_id: id,
            type: benefit.type,
            value: benefit.value,
          })),
          updatedAt: new Date().toISOString(),
        }
        current[index] = updated
        revenueStore.set(userId, current)
        return updated
      }

      async deleteRevenue(userId: string, id: string) {
        const current = revenueStore.get(userId) ?? []
        const index = current.findIndex((item) => item.id === id)

        if (index === -1) {
          return null
        }

        const [deleted] = current.splice(index, 1)
        revenueStore.set(userId, current)
        return deleted ? { id: deleted.id } : null
      }
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
    expect(body.message).not.toBe('Bearer é obrigatório')
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
    expect(body.message).not.toBe('Bearer é obrigatório')
  })
})

describe('Revenue routes', () => {
  it('retorna 401 quando tenta criar renda sem bearer token', async () => {
    const app = createApp()
    const response = await app.request('http://localhost/api/revenues', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Salario',
        type: 'clt',
        revenueAsRange: false,
        min_revenue: 3000,
        cycle: 'monthly',
        benefits: [],
      }),
    })

    expect(response.status).toBe(401)
  })

  it('cria renda com sucesso e normaliza max_revenue para null quando revenueAsRange for false', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'revenue-user-1',
      name: 'Felps',
    })

    const response = await app.request('http://localhost/api/revenues', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Salario principal',
        type: 'clt',
        revenueAsRange: false,
        min_revenue: 5500,
        max_revenue: 7000,
        cycle: 'monthly',
        benefits: [{ type: 'vr', value: 100000 }],
      }),
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      data: RevenueRecord
    }

    expect(response.status).toBe(201)
    expect(body.success).toBeTrue()
    expect(body.status).toBe(201)
    expect(body.message).toBe('Renda criada com sucesso')
    expect(body.data.name).toBe('Salario principal')
    expect(body.data.max_revenue).toBeNull()
    expect(body.data.benefits).toEqual([{
      id: expect.any(String),
      revenue_id: body.data.id,
      type: 'vr',
      value: 100000,
    }])
  })

  it('retorna 400 quando revenueAsRange for true e max_revenue nao for enviado', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'revenue-user-2',
      name: 'Felps',
    })

    const response = await app.request('http://localhost/api/revenues', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Freela',
        type: 'freelance',
        revenueAsRange: true,
        min_revenue: 800,
        cycle: 'monthly',
        benefits: [],
      }),
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      errors: Array<{ path?: string; message: string }>
    }

    expect(response.status).toBe(400)
    expect(body.success).toBeFalse()
  })

  it('retorna 400 quando enum de type for invalido', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'revenue-user-3',
      name: 'Felps',
    })

    const response = await app.request('http://localhost/api/revenues', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Bonus',
        type: 'bonus',
        revenueAsRange: false,
        min_revenue: 1000,
        cycle: 'monthly',
        benefits: [],
      }),
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      message: string
      errors: Array<{ code: string; path?: string; message: string }>
    }

    expect(response.status).toBe(400)
    expect(body.success).toBeFalse()
    expect(body.status).toBe(400)
    expect(body.message).toBe('Dados inválidos')
    expect(body.errors[0]).toEqual({
      code: 'invalid_value',
      path: 'type',
      message: 'Selecione um tipo válido.',
    })
  })

  it('lista apenas as rendas do usuario autenticado', async () => {
    const app = createApp()
    const userOneToken = await generateJWT({
      id: 'revenue-user-4',
      name: 'Felps',
    })
    const userTwoToken = await generateJWT({
      id: 'revenue-user-5',
      name: 'Maria',
    })

    await app.request('http://localhost/api/revenues', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${userOneToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'CLT',
        type: 'clt',
        revenueAsRange: false,
        min_revenue: 4500,
        cycle: 'monthly',
        benefits: [{ type: 'va', value: 90000 }],
      }),
    })

    await app.request('http://localhost/api/revenues', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${userTwoToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'PJ',
        type: 'pj',
        revenueAsRange: true,
        min_revenue: 7000,
        max_revenue: 9000,
        cycle: 'monthly',
        benefits: [],
      }),
    })

    const response = await app.request('http://localhost/api/revenues', {
      headers: {
        authorization: `Bearer ${userOneToken}`,
      },
    })
    const body = (await response.json()) as {
      data: RevenueListItem[]
    }

    expect(response.status).toBe(200)
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.name).toBe('CLT')
    expect(body.data[0]).toEqual({
      id: expect.any(String),
      name: 'CLT',
      type: 'clt',
      min_revenue: 4500,
      max_revenue: null,
      cycle: 'monthly',
      benefits: [{ type: 'va', value: 90000 }],
    })
  })

  it('retorna 404 ao buscar renda inexistente', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'revenue-user-6',
      name: 'Felps',
    })

    const response = await app.request('http://localhost/api/revenues/not-found', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      errors: Array<{ code: string }>
    }

    expect(response.status).toBe(404)
    expect(body.success).toBeFalse()
    expect(body.status).toBe(404)
    expect(body.errors[0]?.code).toBe(ERROR_CODES.REVENUE_NOT_FOUND)
  })

  it('busca uma renda por id com payload resumido', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'revenue-user-6b',
      name: 'Felps',
    })

    const createResponse = await app.request('http://localhost/api/revenues', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Bioola',
        type: 'clt',
        revenueAsRange: true,
        min_revenue: 10,
        max_revenue: 100,
        cycle: 'monthly',
        benefits: [{ type: 'vr', value: 15000 }],
      }),
    })
    const createdBody = (await createResponse.json()) as {
      data: RevenueRecord
    }

    const response = await app.request(`http://localhost/api/revenues/${createdBody.data.id}`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    const body = (await response.json()) as {
      success: boolean
      status: number
      data: RevenueDetailItem
    }

    expect(response.status).toBe(200)
    expect(body.success).toBeTrue()
    expect(body.status).toBe(200)
    expect(body.data).toEqual({
      name: 'Bioola',
      type: 'clt',
      min_revenue: 10,
      max_revenue: 100,
      cycle: 'monthly',
      benefits: [{
        id: expect.any(String),
        revenue_id: createdBody.data.id,
        type: 'vr',
        value: 15000,
      }],
    })
  })

  it('atualiza uma renda existente', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'revenue-user-7',
      name: 'Felps',
    })

    const createResponse = await app.request('http://localhost/api/revenues', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Projeto',
        type: 'pj',
        revenueAsRange: true,
        min_revenue: 5000,
        max_revenue: 8000,
        cycle: 'monthly',
        benefits: [{ type: 'bonus', value: 12345 }],
      }),
    })
    const createdBody = (await createResponse.json()) as {
      data: RevenueRecord
    }

    const response = await app.request(`http://localhost/api/revenues/${createdBody.data.id}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Projeto anual',
        type: 'pj',
        revenueAsRange: false,
        min_revenue: 60000,
        cycle: 'yearly',
        benefits: [{ type: 'health', value: 25000 }],
      }),
    })
    const body = (await response.json()) as {
      success: boolean
      data: RevenueRecord
    }

    expect(response.status).toBe(200)
    expect(body.success).toBeTrue()
    expect(body.data.name).toBe('Projeto anual')
    expect(body.data.cycle).toBe('yearly')
    expect(body.data.max_revenue).toBeNull()
    expect(body.data.benefits).toEqual([{
      id: expect.any(String),
      revenue_id: createdBody.data.id,
      type: 'health',
      value: 25000,
    }])
  })

  it('remove uma renda existente', async () => {
    const app = createApp()
    const token = await generateJWT({
      id: 'revenue-user-8',
      name: 'Felps',
    })

    const createResponse = await app.request('http://localhost/api/revenues', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Doacao',
        type: 'donation',
        revenueAsRange: false,
        min_revenue: 200,
        cycle: 'monthly',
        benefits: [{ type: 'va', value: 5000 }],
      }),
    })
    const createdBody = (await createResponse.json()) as {
      data: RevenueRecord
    }

    const deleteResponse = await app.request(`http://localhost/api/revenues/${createdBody.data.id}`, {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${token}`,
      },
    })
    const deleteBody = (await deleteResponse.json()) as {
      success: boolean
      data: { id: string }
    }

    expect(deleteResponse.status).toBe(200)
    expect(deleteBody.success).toBeTrue()
    expect(deleteBody.data.id).toBe(createdBody.data.id)

    const fetchResponse = await app.request(`http://localhost/api/revenues/${createdBody.data.id}`, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    })

    expect(fetchResponse.status).toBe(404)
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
