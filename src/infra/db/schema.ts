import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const usersTable = sqliteTable('users', {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
})

export const logsTable = sqliteTable('logs', {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  timestamp: text().notNull(),
  severityText: text('severity_text').notNull(),
  severityNumber: integer('severity_number').notNull(),
  body: text().notNull(),
  attributes: text().notNull(),
  traceId: text('trace_id'),
  spanId: text('span_id'),
  createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
})

export const revenuesTable = sqliteTable('revenues', {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  name: text().notNull(),
  type: text().notNull(),
  revenueAsRange: integer('revenue_as_range').notNull(),
  minRevenue: real('min_revenue').notNull(),
  maxRevenue: real('max_revenue'),
  cycle: text().notNull(),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').default(sql`(CURRENT_TIMESTAMP)`),
})

export const benefitsTable = sqliteTable('benefits', {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  revenueId: text('revenue_id').notNull().references(() => revenuesTable.id),
  type: text().notNull(),
  value: integer().notNull(),
})
