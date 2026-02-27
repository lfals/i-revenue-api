import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { ERROR_CODES } from '../shared/errors/error-codes.js'

type CreateAppFn = () => {
  request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

type GenerateJWTFn = (payload: { id: string; name: string }) => Promise<string>

let createApp: CreateAppFn
let generateJWT: GenerateJWTFn

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
})
