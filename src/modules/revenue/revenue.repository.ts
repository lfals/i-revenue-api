import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../infra/db/client'
import { benefitsTable, revenuesTable } from '../../infra/db/schema'
import type { BenefitItem, RevenueInput, RevenueItem } from './revenue.schemas'

type RevenueRecord = RevenueItem
type BenefitRecord = BenefitItem

function mapBenefitRecord(record: {
  id: string
  revenueId: string
  type: string
  value: number
}): BenefitRecord {
  return {
    id: record.id,
    revenue_id: record.revenueId,
    type: record.type,
    value: record.value,
  }
}

function mapRevenueRecord(record: {
  id: string
  name: string
  type: string
  revenueAsRange: number
  minRevenue: number
  maxRevenue: number | null
  cycle: string
  benefits: BenefitRecord[]
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
    benefits: record.benefits,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export class RevenueRepository {
  async createRevenue(userId: string, input: RevenueInput): Promise<RevenueRecord> {
    const createdAt = new Date().toISOString()
    const created = await db.transaction(async (tx) => {
      const insertedRevenue = await tx
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

      const revenue = insertedRevenue[0]!
      const benefits = input.benefits.length
        ? await tx
          .insert(benefitsTable)
          .values(input.benefits.map((benefit) => ({
            revenueId: revenue.id,
            type: benefit.type,
            value: benefit.value,
          })))
          .returning({
            id: benefitsTable.id,
            revenueId: benefitsTable.revenueId,
            type: benefitsTable.type,
            value: benefitsTable.value,
          })
        : []

      return mapRevenueRecord({
        ...revenue,
        benefits: benefits.map(mapBenefitRecord),
      })
    })

    return created
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

    const revenueIds = records.map((record) => record.id)
    const benefits = revenueIds.length ? await this.findBenefitsByRevenueIds(revenueIds) : new Map<string, BenefitRecord[]>()

    return records.map((record) => mapRevenueRecord({
      ...record,
      benefits: benefits.get(record.id) ?? [],
    }))
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

    if (!records[0]) {
      return null
    }

    const benefits = await this.findBenefitsByRevenueIds([records[0].id])
    return mapRevenueRecord({
      ...records[0],
      benefits: benefits.get(records[0].id) ?? [],
    })
  }

  async updateRevenue(userId: string, id: string, input: RevenueInput): Promise<RevenueRecord | null> {
    return db.transaction(async (tx) => {
      const updated = await tx
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

      const revenue = updated[0]
      if (!revenue) {
        return null
      }

      await tx.delete(benefitsTable).where(eq(benefitsTable.revenueId, revenue.id))
      const benefits = input.benefits.length
        ? await tx
          .insert(benefitsTable)
          .values(input.benefits.map((benefit) => ({
            revenueId: revenue.id,
            type: benefit.type,
            value: benefit.value,
          })))
          .returning({
            id: benefitsTable.id,
            revenueId: benefitsTable.revenueId,
            type: benefitsTable.type,
            value: benefitsTable.value,
          })
        : []

      return mapRevenueRecord({
        ...revenue,
        benefits: benefits.map(mapBenefitRecord),
      })
    })
  }

  async deleteRevenue(userId: string, id: string): Promise<{ id: string } | null> {
    const deleted = await db.transaction(async (tx) => {
      await tx.delete(benefitsTable).where(eq(benefitsTable.revenueId, id))
      return tx
        .delete(revenuesTable)
        .where(and(eq(revenuesTable.userId, userId), eq(revenuesTable.id, id)))
        .returning({
          id: revenuesTable.id,
        })
    })

    return deleted[0] ?? null
  }

  private async findBenefitsByRevenueIds(revenueIds: string[]) {
    const benefitMap = new Map<string, BenefitRecord[]>()

    for (const revenueId of revenueIds) {
      const benefits = await db
        .select({
          id: benefitsTable.id,
          revenueId: benefitsTable.revenueId,
          type: benefitsTable.type,
          value: benefitsTable.value,
        })
        .from(benefitsTable)
        .where(eq(benefitsTable.revenueId, revenueId))

      benefitMap.set(revenueId, benefits.map(mapBenefitRecord))
    }

    return benefitMap
  }
}
