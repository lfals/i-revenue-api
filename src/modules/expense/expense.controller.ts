import type { Context } from 'hono'
import type {
  ExpenseDetailItem,
  ExpenseIdParams,
  ExpenseInput,
  ExpenseItem,
} from './expense.schemas'
import { ExpenseService } from './expense.service'

type ExpenseContext = Context<{ Variables: { authUser: { id: string; name: string } } }>

export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) { }

  private toExpenseDetailItem(expense: ExpenseItem): ExpenseDetailItem {
    return {
      name: expense.name,
      type: expense.type,
      min_revenue: expense.min_revenue,
      max_revenue: expense.max_revenue,
      cycle: expense.cycle,
    }
  }

  async create(c: ExpenseContext, payload: ExpenseInput) {
    const authUser = c.get('authUser')
    const expense = await this.expenseService.create(authUser.id, payload)

    return c.json({
      success: true,
      status: 201,
      message: 'Despesa criada com sucesso',
      data: expense,
    }, 201)
  }

  async list(c: ExpenseContext) {
    const authUser = c.get('authUser')
    const expenses = await this.expenseService.list(authUser.id)

    return c.json({
      success: true,
      status: 200,
      message: 'Despesas listadas com sucesso',
      data: expenses,
    }, 200)
  }

  async findById(c: ExpenseContext, params: ExpenseIdParams) {
    const authUser = c.get('authUser')
    const expense = await this.expenseService.findById(authUser.id, params.id)

    return c.json({
      success: true,
      status: 200,
      message: 'Despesa encontrada com sucesso',
      data: this.toExpenseDetailItem(expense),
    }, 200)
  }

  async update(c: ExpenseContext, params: ExpenseIdParams, payload: ExpenseInput) {
    const authUser = c.get('authUser')
    const expense = await this.expenseService.update(authUser.id, params.id, payload)

    return c.json({
      success: true,
      status: 200,
      message: 'Despesa atualizada com sucesso',
      data: expense,
    }, 200)
  }

  async delete(c: ExpenseContext, params: ExpenseIdParams) {
    const authUser = c.get('authUser')
    const deleted = await this.expenseService.delete(authUser.id, params.id)

    return c.json({
      success: true,
      status: 200,
      message: 'Despesa removida com sucesso',
      data: deleted,
    }, 200)
  }
}
