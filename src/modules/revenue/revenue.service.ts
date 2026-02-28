import { AppError } from '../../shared/errors/app-error'
import { ERROR_CODES } from '../../shared/errors/error-codes'
import { logger } from '../../shared/logger/logger'
import type { RevenueInput } from './revenue.schemas'
import { RevenueRepository } from './revenue.repository'

export class RevenueService {
  constructor(private readonly revenueRepository: RevenueRepository) { }

  private normalizeInput(input: RevenueInput): RevenueInput {
    if (input.revenueAsRange && input.max_revenue != null && input.max_revenue < input.min_revenue) {
      throw new AppError(
        400,
        'Faixa de renda inválida',
        ERROR_CODES.INVALID_REVENUE_RANGE,
        [{
          code: ERROR_CODES.INVALID_REVENUE_RANGE,
          message: 'A receita máxima deve ser maior ou igual à receita mínima.',
          path: 'max_revenue',
        }],
      )
    }

    return {
      ...input,
      max_revenue: input.revenueAsRange ? (input.max_revenue ?? null) : null,
    }
  }

  async create(userId: string, input: RevenueInput) {
    try {
      return await this.revenueRepository.createRevenue(userId, this.normalizeInput(input))
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      logger.error('revenue.create.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
        userId,
      })
      throw new AppError(500, 'Erro interno ao criar renda', ERROR_CODES.REVENUE_CREATE_FAILED)
    }
  }

  async list(userId: string) {
    try {
      return await this.revenueRepository.listRevenuesByUser(userId)
    } catch (error) {
      logger.error('revenue.list.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
        userId,
      })
      throw new AppError(500, 'Erro interno ao listar rendas', ERROR_CODES.INTERNAL_ERROR)
    }
  }

  async findById(userId: string, id: string) {
    try {
      const revenue = await this.revenueRepository.findRevenueById(userId, id)

      if (!revenue) {
        throw new AppError(
          404,
          'Renda não encontrada',
          ERROR_CODES.REVENUE_NOT_FOUND,
          [{ code: ERROR_CODES.REVENUE_NOT_FOUND, message: 'Renda não encontrada' }],
        )
      }

      return revenue
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      logger.error('revenue.find_by_id.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
        userId,
        revenueId: id,
      })
      throw new AppError(500, 'Erro interno ao buscar renda', ERROR_CODES.INTERNAL_ERROR)
    }
  }

  async update(userId: string, id: string, input: RevenueInput) {
    try {
      const revenue = await this.revenueRepository.updateRevenue(userId, id, this.normalizeInput(input))

      if (!revenue) {
        throw new AppError(
          404,
          'Renda não encontrada',
          ERROR_CODES.REVENUE_NOT_FOUND,
          [{ code: ERROR_CODES.REVENUE_NOT_FOUND, message: 'Renda não encontrada' }],
        )
      }

      return revenue
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      logger.error('revenue.update.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
        userId,
        revenueId: id,
      })
      throw new AppError(500, 'Erro interno ao atualizar renda', ERROR_CODES.REVENUE_UPDATE_FAILED)
    }
  }

  async delete(userId: string, id: string) {
    try {
      const deleted = await this.revenueRepository.deleteRevenue(userId, id)

      if (!deleted) {
        throw new AppError(
          404,
          'Renda não encontrada',
          ERROR_CODES.REVENUE_NOT_FOUND,
          [{ code: ERROR_CODES.REVENUE_NOT_FOUND, message: 'Renda não encontrada' }],
        )
      }

      return deleted
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      logger.error('revenue.delete.unexpected_error', {
        error: error instanceof Error ? error.message : 'unknown_error',
        userId,
        revenueId: id,
      })
      throw new AppError(500, 'Erro interno ao remover renda', ERROR_CODES.REVENUE_DELETE_FAILED)
    }
  }
}
