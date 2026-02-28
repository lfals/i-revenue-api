import type { Context } from 'hono'
import type {
  BenefitListItem,
  RevenueDetailItem,
  RevenueIdParams,
  RevenueInput,
  RevenueListItem,
} from './revenue.schemas'
import { RevenueService } from './revenue.service'

type RevenueContext = Context<{ Variables: { authUser: { id: string; name: string } } }>

export class RevenueController {
  constructor(private readonly revenueService: RevenueService) { }

  private toBenefitListItem(benefit: Awaited<ReturnType<RevenueService['list']>>[number]['benefits'][number]): BenefitListItem {
    return {
      type: benefit.type,
      value: benefit.value,
    }
  }

  private toRevenueListItem(revenue: Awaited<ReturnType<RevenueService['list']>>[number]): RevenueListItem {
    return {
      id: revenue.id,
      name: revenue.name,
      type: revenue.type,
      min_revenue: revenue.min_revenue,
      max_revenue: revenue.max_revenue,
      cycle: revenue.cycle,
      benefits: revenue.benefits.map((benefit) => this.toBenefitListItem(benefit)),
    }
  }

  private toRevenueDetailItem(revenue: Awaited<ReturnType<RevenueService['findById']>>): RevenueDetailItem {
    return {
      name: revenue.name,
      type: revenue.type,
      min_revenue: revenue.min_revenue,
      max_revenue: revenue.max_revenue,
      cycle: revenue.cycle,
      benefits: revenue.benefits,
    }
  }

  async create(c: RevenueContext, payload: RevenueInput) {
    const authUser = c.get('authUser')
    const revenue = await this.revenueService.create(authUser.id, payload)

    return c.json({
      success: true,
      status: 201,
      message: 'Renda criada com sucesso',
      data: revenue,
    }, 201)
  }

  async list(c: RevenueContext) {
    const authUser = c.get('authUser')
    const revenues = await this.revenueService.list(authUser.id)

    return c.json({
      success: true,
      status: 200,
      message: 'Rendas listadas com sucesso',
      data: revenues.map((revenue) => this.toRevenueListItem(revenue)),
    }, 200)
  }

  async findById(c: RevenueContext, params: RevenueIdParams) {
    const authUser = c.get('authUser')
    const revenue = await this.revenueService.findById(authUser.id, params.id)

    return c.json({
      success: true,
      status: 200,
      message: 'Renda encontrada com sucesso',
      data: this.toRevenueDetailItem(revenue),
    }, 200)
  }

  async update(c: RevenueContext, params: RevenueIdParams, payload: RevenueInput) {
    const authUser = c.get('authUser')
    const revenue = await this.revenueService.update(authUser.id, params.id, payload)

    return c.json({
      success: true,
      status: 200,
      message: 'Renda atualizada com sucesso',
      data: revenue,
    }, 200)
  }

  async delete(c: RevenueContext, params: RevenueIdParams) {
    const authUser = c.get('authUser')
    const deleted = await this.revenueService.delete(authUser.id, params.id)

    return c.json({
      success: true,
      status: 200,
      message: 'Renda removida com sucesso',
      data: deleted,
    }, 200)
  }
}
