import { beforeAll, describe, expect, it, mock } from 'bun:test'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'

type ExpenseInput = {
  name: string
  type: string
  min_revenue: number
  max_revenue?: number | null
  cycle: 'monthly' | 'yearly'
}

type ExpenseRecord = {
  id: string
  name: string
  type: string
  min_revenue: number
  max_revenue: number | null
  cycle: ExpenseInput['cycle']
  createdAt: string | null
  updatedAt: string | null
}

type ExpenseRepositoryContract = {
  createExpense: (userId: string, input: ExpenseInput) => Promise<ExpenseRecord>
  listExpensesByUser: (userId: string) => Promise<ExpenseRecord[]>
  findExpenseById: (userId: string, id: string) => Promise<ExpenseRecord | null>
  updateExpense: (userId: string, id: string, input: ExpenseInput) => Promise<ExpenseRecord | null>
  deleteExpense: (userId: string, id: string) => Promise<{ id: string } | null>
}

type ExpenseServiceCtor = new (repository: ExpenseRepositoryContract) => {
  create: (userId: string, input: ExpenseInput) => Promise<ExpenseRecord>
  list: (userId: string) => Promise<ExpenseRecord[]>
  findById: (userId: string, id: string) => Promise<ExpenseRecord>
  update: (userId: string, id: string, input: ExpenseInput) => Promise<ExpenseRecord>
  delete: (userId: string, id: string) => Promise<{ id: string }>
}

type AppErrorCtor = new (...args: unknown[]) => Error & {
  status: number
  code: string
}

let ExpenseService: ExpenseServiceCtor
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

  const expenseServiceModule = await import('./expense.service.js')
  const appErrorModule = await import('../../shared/errors/app-error.js')

  ExpenseService = expenseServiceModule.ExpenseService as unknown as ExpenseServiceCtor
  AppError = appErrorModule.AppError as AppErrorCtor
})

describe('ExpenseService.create', () => {
  it('normaliza max_revenue para null quando nao for enviado', async () => {
    let receivedInput: ExpenseInput | null = null

    const repository: ExpenseRepositoryContract = {
      async createExpense(_userId, input) {
        receivedInput = input
        return {
          id: 'expense-1',
          ...input,
          max_revenue: input.max_revenue ?? null,
          createdAt: null,
          updatedAt: null,
        }
      },
      async listExpensesByUser() { return [] },
      async findExpenseById() { return null },
      async updateExpense() { return null },
      async deleteExpense() { return null },
    }

    const service = new ExpenseService(repository)
    const result = await service.create('user-1', {
      name: 'Aluguel',
      type: 'moradia',
      min_revenue: 1800,
      cycle: 'monthly',
    })

    expect(receivedInput).not.toBeNull()
    expect(receivedInput!.max_revenue).toBeNull()
    expect(result.max_revenue).toBeNull()
  })

  it('rejeita faixa invalida quando max_revenue for menor que min_revenue', async () => {
    const repository: ExpenseRepositoryContract = {
      async createExpense() { throw new Error('should_not_be_called') },
      async listExpensesByUser() { return [] },
      async findExpenseById() { return null },
      async updateExpense() { return null },
      async deleteExpense() { return null },
    }

    const service = new ExpenseService(repository)

    try {
      await service.create('user-1', {
        name: 'Energia',
        type: 'conta',
        min_revenue: 300,
        max_revenue: 100,
        cycle: 'monthly',
      })
      throw new Error('expected_error_not_thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as InstanceType<AppErrorCtor>).status).toBe(400)
      expect((error as InstanceType<AppErrorCtor>).code).toBe(ERROR_CODES.INVALID_EXPENSE_RANGE)
    }
  })
})

describe('ExpenseService.read operations', () => {
  it('lista despesas do usuario', async () => {
    const repository: ExpenseRepositoryContract = {
      async createExpense() { throw new Error('not_used') },
      async listExpensesByUser(userId) {
        return [{
          id: 'expense-1',
          name: `Despesa de ${userId}`,
          type: 'fixa',
          min_revenue: 500,
          max_revenue: 700,
          cycle: 'monthly',
          createdAt: null,
          updatedAt: null,
        }]
      },
      async findExpenseById() { return null },
      async updateExpense() { return null },
      async deleteExpense() { return null },
    }

    const service = new ExpenseService(repository)
    const result = await service.list('user-2')

    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('Despesa de user-2')
  })

  it('retorna 404 quando despesa nao existe', async () => {
    const repository: ExpenseRepositoryContract = {
      async createExpense() { throw new Error('not_used') },
      async listExpensesByUser() { return [] },
      async findExpenseById() { return null },
      async updateExpense() { return null },
      async deleteExpense() { return null },
    }

    const service = new ExpenseService(repository)

    try {
      await service.findById('user-1', 'missing-id')
      throw new Error('expected_error_not_thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(AppError)
      expect((error as InstanceType<AppErrorCtor>).status).toBe(404)
      expect((error as InstanceType<AppErrorCtor>).code).toBe(ERROR_CODES.EXPENSE_NOT_FOUND)
    }
  })
})

describe('ExpenseService.write operations', () => {
  it('atualiza despesa existente', async () => {
    let receivedInput: ExpenseInput | null = null

    const repository: ExpenseRepositoryContract = {
      async createExpense() { throw new Error('not_used') },
      async listExpensesByUser() { return [] },
      async findExpenseById() { return null },
      async updateExpense(_userId, id, input) {
        receivedInput = input
        return {
          id,
          ...input,
          max_revenue: input.max_revenue ?? null,
          createdAt: null,
          updatedAt: null,
        }
      },
      async deleteExpense() { return null },
    }

    const service = new ExpenseService(repository)
    const result = await service.update('user-1', 'expense-1', {
      name: 'Mercado',
      type: 'alimentacao',
      min_revenue: 900,
      cycle: 'monthly',
    })

    expect(receivedInput).not.toBeNull()
    expect(receivedInput!.max_revenue).toBeNull()
    expect(result.name).toBe('Mercado')
  })

  it('remove despesa existente', async () => {
    const repository: ExpenseRepositoryContract = {
      async createExpense() { throw new Error('not_used') },
      async listExpensesByUser() { return [] },
      async findExpenseById() { return null },
      async updateExpense() { return null },
      async deleteExpense(_userId, id) { return { id } },
    }

    const service = new ExpenseService(repository)
    const result = await service.delete('user-1', 'expense-1')

    expect(result.id).toBe('expense-1')
  })
})
