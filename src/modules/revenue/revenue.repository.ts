import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../infra/db/client'
import { revenuesTable } from '../../infra/db/schema'
import type { RevenueInput, RevenueItem } from './revenue.schemas'

type RevenueRecord = RevenueItem

function mapRevenueRecord(record: {
  id: string
  name: string
  type: string
  revenueAsRange: number
  minRevenue: number
  maxRevenue: number | null
  cycle: string
  createdAt: string | null
  updatedAt: string | null
}): RevenueRecord {
  return {
    id: record.id,
    name: record.name,
    type: record.type as RevenueItem['type'],
    revenueAsRange: Boolean(record.revenueAsRange),
    min_revenue: record.minRevenue,
    max_revenue: record.maxRevenue,
    cycle: record.cycle as RevenueItem['cycle'],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export class RevenueRepository {
  async createRevenue(userId: string, input: RevenueInput): Promise<RevenueRecord> {
    const createdAt = new Date().toISOString()

    const created = await db
      .insert(revenuesTable)
      .values({
        userId,
        name: input.name,
        type: input.type,
        revenueAsRange: input.revenueAsRange ? 1 : 0,
        minRevenue: input.min_revenue,
        maxRevenue: input.max_revenue ?? null,
        cycle: input.cycle,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({
        id: revenuesTable.id,
        name: revenuesTable.name,
        type: revenuesTable.type,
        revenueAsRange: revenuesTable.revenueAsRange,
        minRevenue: revenuesTable.minRevenue,
        maxRevenue: revenuesTable.maxRevenue,
        cycle: revenuesTable.cycle,
        createdAt: revenuesTable.createdAt,
        updatedAt: revenuesTable.updatedAt,
      })

    return mapRevenueRecord(created[0]!)
  }

  async listRevenuesByUser(userId: string): Promise<RevenueRecord[]> {
    const records = await db
      .select({
        id: revenuesTable.id,
        name: revenuesTable.name,
        type: revenuesTable.type,
        revenueAsRange: revenuesTable.revenueAsRange,
        minRevenue: revenuesTable.minRevenue,
        maxRevenue: revenuesTable.maxRevenue,
        cycle: revenuesTable.cycle,
        createdAt: revenuesTable.createdAt,
        updatedAt: revenuesTable.updatedAt,
      })
      .from(revenuesTable)
      .where(eq(revenuesTable.userId, userId))
      .orderBy(desc(revenuesTable.createdAt))

    return records.map(mapRevenueRecord)
  }

  async findRevenueById(userId: string, id: string): Promise<RevenueRecord | null> {
    const records = await db
      .select({
        id: revenuesTable.id,
        name: revenuesTable.name,
        type: revenuesTable.type,
        revenueAsRange: revenuesTable.revenueAsRange,
        minRevenue: revenuesTable.minRevenue,
        maxRevenue: revenuesTable.maxRevenue,
        cycle: revenuesTable.cycle,
        createdAt: revenuesTable.createdAt,
        updatedAt: revenuesTable.updatedAt,
      })
      .from(revenuesTable)
      .where(and(eq(revenuesTable.userId, userId), eq(revenuesTable.id, id)))
      .limit(1)

    return records[0] ? mapRevenueRecord(records[0]) : null
  }

  async updateRevenue(userId: string, id: string, input: RevenueInput): Promise<RevenueRecord | null> {
    const updated = await db
      .update(revenuesTable)
      .set({
        name: input.name,
        type: input.type,
        revenueAsRange: input.revenueAsRange ? 1 : 0,
        minRevenue: input.min_revenue,
        maxRevenue: input.max_revenue ?? null,
        cycle: input.cycle,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(revenuesTable.userId, userId), eq(revenuesTable.id, id)))
      .returning({
        id: revenuesTable.id,
        name: revenuesTable.name,
        type: revenuesTable.type,
        revenueAsRange: revenuesTable.revenueAsRange,
        minRevenue: revenuesTable.minRevenue,
        maxRevenue: revenuesTable.maxRevenue,
        cycle: revenuesTable.cycle,
        createdAt: revenuesTable.createdAt,
        updatedAt: revenuesTable.updatedAt,
      })

    return updated[0] ? mapRevenueRecord(updated[0]) : null
  }

  async deleteRevenue(userId: string, id: string): Promise<{ id: string } | null> {
    const deleted = await db
      .delete(revenuesTable)
      .where(and(eq(revenuesTable.userId, userId), eq(revenuesTable.id, id)))
      .returning({
        id: revenuesTable.id,
      })

    return deleted[0] ?? null
  }
}
