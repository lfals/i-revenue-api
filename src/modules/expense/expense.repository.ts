import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../infra/db/client'
import { expensesTable } from '../../infra/db/schema'
import type { ExpenseInput, ExpenseItem } from './expense.schemas'

function mapExpenseRecord(record: {
  id: string
  name: string
  type: string
  minRevenue: number
  maxRevenue: number | null
  cycle: string
  createdAt: string | null
  updatedAt: string | null
}): ExpenseItem {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    min_revenue: record.minRevenue,
    max_revenue: record.maxRevenue,
    cycle: record.cycle as ExpenseItem['cycle'],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export class ExpenseRepository {
  async createExpense(userId: string, input: ExpenseInput): Promise<ExpenseItem> {
    const createdAt = new Date().toISOString()
    const created = await db
      .insert(expensesTable)
      .values({
        userId,
        name: input.name,
        type: input.type,
        minRevenue: input.min_revenue,
        maxRevenue: input.max_revenue ?? null,
        cycle: input.cycle,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({
        id: expensesTable.id,
        name: expensesTable.name,
        type: expensesTable.type,
        minRevenue: expensesTable.minRevenue,
        maxRevenue: expensesTable.maxRevenue,
        cycle: expensesTable.cycle,
        createdAt: expensesTable.createdAt,
        updatedAt: expensesTable.updatedAt,
      })

    return mapExpenseRecord(created[0]!)
  }

  async listExpensesByUser(userId: string): Promise<ExpenseItem[]> {
    const expenses = await db
      .select({
        id: expensesTable.id,
        name: expensesTable.name,
        type: expensesTable.type,
        minRevenue: expensesTable.minRevenue,
        maxRevenue: expensesTable.maxRevenue,
        cycle: expensesTable.cycle,
        createdAt: expensesTable.createdAt,
        updatedAt: expensesTable.updatedAt,
      })
      .from(expensesTable)
      .where(eq(expensesTable.userId, userId))
      .orderBy(desc(expensesTable.createdAt))

    return expenses.map(mapExpenseRecord)
  }

  async findExpenseById(userId: string, id: string): Promise<ExpenseItem | null> {
    const expenses = await db
      .select({
        id: expensesTable.id,
        name: expensesTable.name,
        type: expensesTable.type,
        minRevenue: expensesTable.minRevenue,
        maxRevenue: expensesTable.maxRevenue,
        cycle: expensesTable.cycle,
        createdAt: expensesTable.createdAt,
        updatedAt: expensesTable.updatedAt,
      })
      .from(expensesTable)
      .where(and(eq(expensesTable.userId, userId), eq(expensesTable.id, id)))
      .limit(1)

    return expenses[0] ? mapExpenseRecord(expenses[0]) : null
  }

  async updateExpense(userId: string, id: string, input: ExpenseInput): Promise<ExpenseItem | null> {
    const updated = await db
      .update(expensesTable)
      .set({
        name: input.name,
        type: input.type,
        minRevenue: input.min_revenue,
        maxRevenue: input.max_revenue ?? null,
        cycle: input.cycle,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(expensesTable.userId, userId), eq(expensesTable.id, id)))
      .returning({
        id: expensesTable.id,
        name: expensesTable.name,
        type: expensesTable.type,
        minRevenue: expensesTable.minRevenue,
        maxRevenue: expensesTable.maxRevenue,
        cycle: expensesTable.cycle,
        createdAt: expensesTable.createdAt,
        updatedAt: expensesTable.updatedAt,
      })

    return updated[0] ? mapExpenseRecord(updated[0]) : null
  }

  async deleteExpense(userId: string, id: string): Promise<{ id: string } | null> {
    const deleted = await db
      .delete(expensesTable)
      .where(and(eq(expensesTable.userId, userId), eq(expensesTable.id, id)))
      .returning({
        id: expensesTable.id,
      })

    return deleted[0] ?? null
  }
}
