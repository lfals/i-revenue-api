import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

type RevenueInput = {
  name: string
  type: 'clt' | 'pj' | 'freelance' | 'donation' | 'other'
  revenueAsRange: boolean
  min_revenue: number
  max_revenue?: number | null
  cycle: 'monthly' | 'yearly'
}

type RevenueRecord = {
  id: string
  name: string
  type: RevenueInput['type']
  revenueAsRange: boolean
  min_revenue: number
  max_revenue: number | null
  cycle: RevenueInput['cycle']
  createdAt: string | null
  updatedAt: string | null
}

type RevenueRepositoryContract = {
  createRevenue: (userId: string, input: RevenueInput) => Promise<RevenueRecord>
  listRevenuesByUser: (userId: string) => Promise<RevenueRecord[]>
  findRevenueById: (userId: string, id: string) => Promise<RevenueRecord | null>
  updateRevenue: (userId: string, id: string, input: RevenueInput) => Promise<RevenueRecord | null>
  deleteRevenue: (userId: string, id: string) => Promise<{ id: string } | null>
}

type RevenueServiceCtor = new (repository: RevenueRepositoryContract) => {
  create: (userId: string, input: RevenueInput) => Promise<RevenueRecord>
  list: (userId: string) => Promise<RevenueRecord[]>
  findById: (userId: string, id: string) => Promise<RevenueRecord>
  update: (userId: string, id: string, input: RevenueInput) => Promise<RevenueRecord>
  delete: (userId: string, id: string) => Promise<{ id: string }>
}

type AppErrorCtor = new (...args: unknown[]) => Error & {
  status: number
  code: string
}

let RevenueService: RevenueServiceCtor
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

  const revenueServiceModule = await import('./revenue.service.js')
  const appErrorModule = await import('../../shared/errors/app-error.js')

  RevenueService = revenueServiceModule.RevenueService as RevenueServiceCtor
  AppError = appErrorModule.AppError as AppErrorCtor
})

describe('RevenueService.create', () => {
  it('normaliza max_revenue para null quando revenueAsRange for false', async () => {
    let receivedInput: RevenueInput | null = null

    const repository: RevenueRepositoryContract = {
      async createRevenue(_userId, input) {
        receivedInput = input
        return {
          id: 'revenue-1',
          ...input,
          max_revenue: input.max_revenue ?? null,
          createdAt: null,
          updatedAt: null,
        }
      },
      async listRevenuesByUser() {
        return []
      },
      async findRevenueById() {
        return null
      },
      async updateRevenue() {
        return null
      },
      async deleteRevenue() {
        return null
      },
    }

    const service = new RevenueService(repository)
    const result = await service.create('user-1', {
      name: 'Salario',
      type: 'clt',
      revenueAsRange: false,
      min_revenue: 3000,
      max_revenue: 5000,
      cycle: 'monthly',
    })

    expect(receivedInput).not.toBeNull()
    expect(receivedInput!.max_revenue).toBeNull()
    expect(result.max_revenue).toBeNull()
  })

  it('mantem faixa valida quando revenueAsRange for true', async () => {
    const repository: RevenueRepositoryContract = {
      async createRevenue(_userId, input) {
        return {
          id: 'revenue-2',
          ...input,
          max_revenue: input.max_revenue ?? null,
          createdAt: null,
          updatedAt: null,
        }
      },
      async listRevenuesByUser() {
        return []
      },
      async findRevenueById() {
        return null
      },
      async updateRevenue() {
        return null
      },
      async deleteRevenue() {
        return null
      },
    }

    const service = new RevenueService(repository)
    const result = await service.create('user-1', {
      name: 'Projeto',
      type: 'pj',
      revenueAsRange: true,
      min_revenue: 4000,
      max_revenue: 7000,
      cycle: 'monthly',
    })

    expect(result.max_revenue).toBe(7000)
  })

  it('rejeita faixa invalida quando max_revenue for menor que min_revenue', async () => {
    const repository: RevenueRepositoryContract = {
      async createRevenue() {
        throw new Error('should_not_be_called')
      },
      async listRevenuesByUser() {
        return []
      },
      async findRevenueById() {
        return null
      },
      async updateRevenue() {
        return null
      },
      async deleteRevenue() {
        return null
      },
    }

    const service = new RevenueService(repository)

    try {
      await service.create('user-1', {
        name: 'Freela',
        type: 'freelance',
        revenueAsRange: true,
        min_revenue: 5000,
        max_revenue: 3000,
        cycle: 'monthly',
      })
      throw new Error('expected_error_not_thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as InstanceType<AppErrorCtor>).status).toBe(400)
      expect((error as InstanceType<AppErrorCtor>).code).toBe(ERROR_CODES.INVALID_REVENUE_RANGE)
    }
  })
})

describe('RevenueService.read operations', () => {
  it('lista rendas do usuario', async () => {
    const repository: RevenueRepositoryContract = {
      async createRevenue() {
        throw new Error('not_used')
      },
      async listRevenuesByUser(userId) {
        return [{
          id: 'revenue-1',
          name: `Renda de ${userId}`,
          type: 'clt',
          revenueAsRange: false,
          min_revenue: 2500,
          max_revenue: null,
          cycle: 'monthly',
          createdAt: null,
          updatedAt: null,
        }]
      },
      async findRevenueById() {
        return null
      },
      async updateRevenue() {
        return null
      },
      async deleteRevenue() {
        return null
      },
    }

    const service = new RevenueService(repository)
    const result = await service.list('user-2')

    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('Renda de user-2')
  })

  it('busca renda existente', async () => {
    const repository: RevenueRepositoryContract = {
      async createRevenue() {
        throw new Error('not_used')
      },
      async listRevenuesByUser() {
        return []
      },
      async findRevenueById() {
        return {
          id: 'revenue-1',
          name: 'Renda',
          type: 'other',
          revenueAsRange: false,
          min_revenue: 100,
          max_revenue: null,
          cycle: 'yearly',
          createdAt: null,
          updatedAt: null,
        }
      },
      async updateRevenue() {
        return null
      },
      async deleteRevenue() {
        return null
      },
    }

    const service = new RevenueService(repository)
    const result = await service.findById('user-1', 'revenue-1')

    expect(result.id).toBe('revenue-1')
  })

  it('retorna 404 quando renda nao existe', async () => {
    const repository: RevenueRepositoryContract = {
      async createRevenue() {
        throw new Error('not_used')
      },
      async listRevenuesByUser() {
        return []
      },
      async findRevenueById() {
        return null
      },
      async updateRevenue() {
        return null
      },
      async deleteRevenue() {
        return null
      },
    }

    const service = new RevenueService(repository)

    try {
      await service.findById('user-1', 'missing-id')
      throw new Error('expected_error_not_thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as InstanceType<AppErrorCtor>).status).toBe(404)
      expect((error as InstanceType<AppErrorCtor>).code).toBe(ERROR_CODES.REVENUE_NOT_FOUND)
    }
  })
})

describe('RevenueService.write operations', () => {
  it('atualiza renda existente', async () => {
    let receivedInput: RevenueInput | null = null

    const repository: RevenueRepositoryContract = {
      async createRevenue() {
        throw new Error('not_used')
      },
      async listRevenuesByUser() {
        return []
      },
      async findRevenueById() {
        return null
      },
      async updateRevenue(_userId, id, input) {
        receivedInput = input
        return {
          id,
          ...input,
          max_revenue: input.max_revenue ?? null,
          createdAt: null,
          updatedAt: null,
        }
      },
      async deleteRevenue() {
        return null
      },
    }

    const service = new RevenueService(repository)
    const result = await service.update('user-1', 'revenue-1', {
      name: 'Novo salario',
      type: 'clt',
      revenueAsRange: false,
      min_revenue: 9000,
      max_revenue: 11000,
      cycle: 'yearly',
    })

    expect(receivedInput).not.toBeNull()
    expect(receivedInput!.max_revenue).toBeNull()
    expect(result.cycle).toBe('yearly')
  })

  it('remove renda existente', async () => {
    const repository: RevenueRepositoryContract = {
      async createRevenue() {
        throw new Error('not_used')
      },
      async listRevenuesByUser() {
        return []
      },
      async findRevenueById() {
        return null
      },
      async updateRevenue() {
        return null
      },
      async deleteRevenue(_userId, id) {
        return { id }
      },
    }

    const service = new RevenueService(repository)
    const result = await service.delete('user-1', 'revenue-1')

    expect(result.id).toBe('revenue-1')
  })

  it('mapeia erro inesperado de update para erro interno coerente', async () => {
    const repository: RevenueRepositoryContract = {
      async createRevenue() {
        throw new Error('not_used')
      },
      async listRevenuesByUser() {
        return []
      },
      async findRevenueById() {
        return null
      },
      async updateRevenue() {
        throw new Error('db down')
      },
      async deleteRevenue() {
        return null
      },
    }

    const service = new RevenueService(repository)

    try {
      await service.update('user-1', 'revenue-1', {
        name: 'Projeto',
        type: 'pj',
        revenueAsRange: true,
        min_revenue: 1000,
        max_revenue: 2000,
        cycle: 'monthly',
      })
      throw new Error('expected_error_not_thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as InstanceType<AppErrorCtor>).status).toBe(500)
      expect((error as InstanceType<AppErrorCtor>).code).toBe(ERROR_CODES.REVENUE_UPDATE_FAILED)
    }
  })
})
