import { AppError } from '../../shared/errors/app-error'
import { ERROR_CODES } from '../../shared/errors/error-codes'
import { logger } from '../../shared/logger/logger'
import type { ExpenseInput } from './expense.schemas'
import { ExpenseRepository } from './expense.repository'

export class ExpenseService {
  constructor(private readonly expenseRepository: ExpenseRepository) { }

  private normalizeInput(input: ExpenseInput): ExpenseInput {
    if (input.max_revenue != null && input.max_revenue < input.min_revenue) {
      throw new AppError(
        400,
        'Faixa de despesa inválida',
        ERROR_CODES.INVALID_EXPENSE_RANGE,
        [{
          code: ERROR_CODES.INVALID_EXPENSE_RANGE,
          message: 'O valor máximo deve ser maior ou igual ao valor mínimo.',
          path: 'max_revenue',
        }],
      )
    }

    return {
      ...input,
      max_revenue: input.max_revenue ?? null,
    }
  }

  async create(userId: string, input: ExpenseInput) {
    try {
      return await this.expenseRepository.createExpense(userId, this.normalizeInput(input))
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      logger.error('expense.create.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
        userId,
      })
      throw new AppError(500, 'Erro interno ao criar despesa', ERROR_CODES.EXPENSE_CREATE_FAILED)
    }
  }

  async list(userId: string) {
    try {
      return await this.expenseRepository.listExpensesByUser(userId)
    } catch (error) {
      logger.error('expense.list.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
        userId,
      })
      throw new AppError(500, 'Erro interno ao listar despesas', ERROR_CODES.INTERNAL_ERROR)
    }
  }

  async findById(userId: string, id: string) {
    try {
      const expense = await this.expenseRepository.findExpenseById(userId, id)

      if (!expense) {
        throw new AppError(
          404,
          'Despesa não encontrada',
          ERROR_CODES.EXPENSE_NOT_FOUND,
          [{ code: ERROR_CODES.EXPENSE_NOT_FOUND, message: 'Despesa não encontrada' }],
        )
      }

      return expense
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      logger.error('expense.find_by_id.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
        userId,
        expenseId: id,
      })
      throw new AppError(500, 'Erro interno ao buscar despesa', ERROR_CODES.INTERNAL_ERROR)
    }
  }

  async update(userId: string, id: string, input: ExpenseInput) {
    try {
      const expense = await this.expenseRepository.updateExpense(userId, id, this.normalizeInput(input))

      if (!expense) {
        throw new AppError(
          404,
          'Despesa não encontrada',
          ERROR_CODES.EXPENSE_NOT_FOUND,
          [{ code: ERROR_CODES.EXPENSE_NOT_FOUND, message: 'Despesa não encontrada' }],
        )
      }

      return expense
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      logger.error('expense.update.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
        userId,
        expenseId: id,
      })
      throw new AppError(500, 'Erro interno ao atualizar despesa', ERROR_CODES.EXPENSE_UPDATE_FAILED)
    }
  }

  async delete(userId: string, id: string) {
    try {
      const deleted = await this.expenseRepository.deleteExpense(userId, id)

      if (!deleted) {
        throw new AppError(
          404,
          'Despesa não encontrada',
          ERROR_CODES.EXPENSE_NOT_FOUND,
          [{ code: ERROR_CODES.EXPENSE_NOT_FOUND, message: 'Despesa não encontrada' }],
        )
      }

      return deleted
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      logger.error('expense.delete.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
        userId,
        expenseId: id,
      })
      throw new AppError(500, 'Erro interno ao remover despesa', ERROR_CODES.EXPENSE_DELETE_FAILED)
    }
  }
}
