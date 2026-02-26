import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const usersTable = sqliteTable('users_table', {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  email: text().notNull().unique(),
  password: text().notNull(),
  createdAt: text().default(sql`(CURRENT_TIMESTAMP)`),
})

export const logsTable = sqliteTable('logs_table', {
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
