import { beforeAll, describe, expect, it, mock } from 'bun:test'

type AuthServiceCtor = new (authRepository: {
  createUser: (input: { name: string; email: string; password: string }) => Promise<{ id: string; name: string } | null>
  findUserByEmail: (email: string) => Promise<{ id: string; name: string; password: string } | null>
}) => {
  register: (input: { name: string; email: string; password: string }) => Promise<unknown>
  login: (input: { email: string; password: string }) => Promise<unknown>
}

type AppErrorCtor = new (...args: unknown[]) => Error & {
  status: number
  code: string
}

let AuthService: AuthServiceCtor
let AppError: AppErrorCtor

beforeAll(async () => {
  mock.module('../../shared/logger/logger', () => ({
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  }))

  mock.module('../../infra/security/jwt.service', () => ({
    generateJWT: async ({ id }: { id: string }) => `token-${id}`,
  }))

  const authServiceModule = await import('./auth.service')
  const appErrorModule = await import('../../shared/errors/app-error')

  AuthService = authServiceModule.AuthService as AuthServiceCtor
  AppError = appErrorModule.AppError as AppErrorCtor
})

describe('AuthService.register', () => {
  it('cria usuario, aplica hash na senha e retorna token', async () => {
    let receivedPassword = ''

    const repository = {
      async createUser(input: { name: string; email: string; password: string }) {
        receivedPassword = input.password
        return { id: 'user-1', name: input.name }
      },
      async findUserByEmail() {
        return null
      },
    }

    const service = new AuthService(repository)

    const result = (await service.register({
      name: 'Felps',
      email: 'felps@example.com',
      password: '123456',
    })) as {
      message: string
      user: { id: string; name: string; token: string }
    }

    expect(result.message).toBe('Usuário criado com sucesso')
    expect(result.user.id).toBe('user-1')
    expect(result.user.name).toBe('Felps')
    expect(typeof result.user.token).toBe('string')
    expect(result.user.token.length).toBeGreaterThan(10)
    expect(receivedPassword).not.toBe('123456')
    expect(await Bun.password.verify('123456', receivedPassword)).toBeTrue()
  })

  it('retorna conflito quando repositorio nao cria usuario', async () => {
    const repository = {
      async createUser() {
        return null
      },
      async findUserByEmail() {
        return null
      },
    }

    const service = new AuthService(repository)

    try {
      await service.register({
        name: 'Felps',
        email: 'felps@example.com',
        password: '123456',
      })
      throw new Error('expected_error_not_thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as InstanceType<AppErrorCtor>).status).toBe(409)
      expect((error as InstanceType<AppErrorCtor>).code).toBe('user_already_exists')
    }
  })

  it('mapeia erro de unique constraint para conflito de email', async () => {
    const repository = {
      async createUser() {
        throw new Error('UNIQUE constraint failed: users.email')
      },
      async findUserByEmail() {
        return null
      },
    }

    const service = new AuthService(repository)

    try {
      await service.register({
        name: 'Felps',
        email: 'felps@example.com',
        password: '123456',
      })
      throw new Error('expected_error_not_thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as InstanceType<AppErrorCtor>).status).toBe(409)
      expect((error as InstanceType<AppErrorCtor>).code).toBe('email_already_exists')
    }
  })
})

describe('AuthService.login', () => {
  it('autentica usuario valido e retorna token', async () => {
    const hash = await Bun.password.hash('123456')

    const repository = {
      async createUser() {
        return null
      },
      async findUserByEmail() {
        return { id: 'user-1', name: 'Felps', password: hash }
      },
    }

    const service = new AuthService(repository)
    const result = (await service.login({
      email: 'felps@example.com',
      password: '123456',
    })) as {
      message: string
      id: string
      name: string
      token: string
    }

    expect(result.message).toBe('Login realizado com sucesso')
    expect(result.id).toBe('user-1')
    expect(result.name).toBe('Felps')
    expect(typeof result.token).toBe('string')
    expect(result.token.length).toBeGreaterThan(10)
  })

  it('retorna credenciais invalidas quando usuario nao existe', async () => {
    const repository = {
      async createUser() {
        return null
      },
      async findUserByEmail() {
        return null
      },
    }

    const service = new AuthService(repository)

    try {
      await service.login({ email: 'felps@example.com', password: '123456' })
      throw new Error('expected_error_not_thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as InstanceType<AppErrorCtor>).status).toBe(401)
      expect((error as InstanceType<AppErrorCtor>).code).toBe('invalid_credentials')
    }
  })

  it('retorna credenciais invalidas quando senha estiver errada', async () => {
    const hash = await Bun.password.hash('senha-correta')

    const repository = {
      async createUser() {
        return null
      },
      async findUserByEmail() {
        return { id: 'user-1', name: 'Felps', password: hash }
      },
    }

    const service = new AuthService(repository)

    try {
      await service.login({ email: 'felps@example.com', password: 'senha-incorreta' })
      throw new Error('expected_error_not_thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as InstanceType<AppErrorCtor>).status).toBe(401)
      expect((error as InstanceType<AppErrorCtor>).code).toBe('invalid_credentials')
    }
  })

  it('retorna erro interno quando ocorre falha inesperada no login', async () => {
    const repository = {
      async createUser() {
        return null
      },
      async findUserByEmail() {
        throw new Error('db connection lost')
      },
    }

    const service = new AuthService(repository)

    try {
      await service.login({ email: 'felps@example.com', password: '123456' })
      throw new Error('expected_error_not_thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as InstanceType<AppErrorCtor>).status).toBe(500)
      expect((error as InstanceType<AppErrorCtor>).code).toBe('login_failed')
    }
  })
})
