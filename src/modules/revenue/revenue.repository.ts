import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../infra/db/client'
import { benefitsTable, revenuesTable, taxesTable } from '../../infra/db/schema'
import type {
  BenefitItem,
  RevenueInput,
  RevenueItem,
  TaxItem,
} from './revenue.schemas'

type RevenueRecord = RevenueItem
type BenefitRecord = BenefitItem
type TaxRecord = TaxItem

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

function mapTaxRecord(record: {
  id: string
  revenueId: string
  name: string
  value: number
}): TaxRecord {
  return {
    id: record.id,
    revenue_id: record.revenueId,
    name: record.name,
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
  taxes: TaxRecord[]
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
    taxes: record.taxes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export class RevenueRepository {
  async createRevenue(userId: string, input: RevenueInput): Promise<RevenueRecord> {
    const createdAt = new Date().toISOString()

    return db.transaction(async (tx) => {
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
      const benefits = await this.insertBenefits(tx, revenue.id, input.benefits)
      const taxes = await this.insertTaxes(tx, revenue.id, input.taxes)

      return mapRevenueRecord({
        ...revenue,
        benefits,
        taxes,
      })
    })
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
    const benefits = revenueIds.length
      ? await this.findBenefitsByRevenueIds(revenueIds)
      : new Map<string, BenefitRecord[]>()
    const taxes = revenueIds.length
      ? await this.findTaxesByRevenueIds(revenueIds)
      : new Map<string, TaxRecord[]>()

    return records.map((record) => mapRevenueRecord({
      ...record,
      benefits: benefits.get(record.id) ?? [],
      taxes: taxes.get(record.id) ?? [],
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
    const taxes = await this.findTaxesByRevenueIds([records[0].id])

    return mapRevenueRecord({
      ...records[0],
      benefits: benefits.get(records[0].id) ?? [],
      taxes: taxes.get(records[0].id) ?? [],
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
      await tx.delete(taxesTable).where(eq(taxesTable.revenueId, revenue.id))

      const benefits = await this.insertBenefits(tx, revenue.id, input.benefits)
      const taxes = await this.insertTaxes(tx, revenue.id, input.taxes)

      return mapRevenueRecord({
        ...revenue,
        benefits,
        taxes,
      })
    })
  }

  async deleteRevenue(userId: string, id: string): Promise<{ id: string } | null> {
    const deleted = await db.transaction(async (tx) => {
      await tx.delete(benefitsTable).where(eq(benefitsTable.revenueId, id))
      await tx.delete(taxesTable).where(eq(taxesTable.revenueId, id))

      return tx
        .delete(revenuesTable)
        .where(and(eq(revenuesTable.userId, userId), eq(revenuesTable.id, id)))
        .returning({
          id: revenuesTable.id,
        })
    })

    return deleted[0] ?? null
  }

  private async insertBenefits(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    revenueId: string,
    benefits: RevenueInput['benefits'],
  ) {
    if (!benefits.length) {
      return [] as BenefitRecord[]
    }

    const inserted = await tx
      .insert(benefitsTable)
      .values(benefits.map((benefit) => ({
        revenueId,
        type: benefit.type,
        value: benefit.value,
      })))
      .returning({
        id: benefitsTable.id,
        revenueId: benefitsTable.revenueId,
        type: benefitsTable.type,
        value: benefitsTable.value,
      })

    return inserted.map(mapBenefitRecord)
  }

  private async insertTaxes(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    revenueId: string,
    taxes: RevenueInput['taxes'],
  ) {
    if (!taxes.length) {
      return [] as TaxRecord[]
    }

    const inserted = await tx
      .insert(taxesTable)
      .values(taxes.map((tax) => ({
        revenueId,
        name: tax.name,
        value: tax.value,
      })))
      .returning({
        id: taxesTable.id,
        revenueId: taxesTable.revenueId,
        name: taxesTable.name,
        value: taxesTable.value,
      })

    return inserted.map(mapTaxRecord)
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

  private async findTaxesByRevenueIds(revenueIds: string[]) {
    const taxMap = new Map<string, TaxRecord[]>()

    for (const revenueId of revenueIds) {
      const taxes = await db
        .select({
          id: taxesTable.id,
          revenueId: taxesTable.revenueId,
          name: taxesTable.name,
          value: taxesTable.value,
        })
        .from(taxesTable)
        .where(eq(taxesTable.revenueId, revenueId))

      taxMap.set(revenueId, taxes.map(mapTaxRecord))
    }

    return taxMap
  }
}
