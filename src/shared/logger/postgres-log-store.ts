import { Pool } from 'pg'
import { env } from '../../config/env'

export type LogAttributes = Record<string, unknown>

export type LogRecordPayload = {
  timestamp: string
  severity_text: string
  severity_number: number
  body: string
  attributes: LogAttributes
  trace_id?: string
  span_id?: string
}

let pool: Pool | null = null
let logTableReady: Promise<void> | null = null

function getPool(): Pool | null {
  if (!env.DATABASE_URL) {
    return null
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 5,
      ssl: false,
    })
  }

  return pool
}

async function ensureLogsTable() {
  if (logTableReady) {
    return logTableReady
  }

  const activePool = getPool()
  if (!activePool) {
    return
  }

  logTableReady = activePool
    .query(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        severity_text TEXT NOT NULL,
        severity_number INTEGER NOT NULL,
        body TEXT NOT NULL,
        attributes JSONB NOT NULL,
        trace_id TEXT,
        span_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    .then(() => undefined)

  return logTableReady
}

export async function persistLogRecord(logRecord: LogRecordPayload) {
  const activePool = getPool()
  if (!activePool) {
    return
  }

  await ensureLogsTable()
  await activePool.query(
    `
      INSERT INTO logs (
        id,
        timestamp,
        severity_text,
        severity_number,
        body,
        attributes,
        trace_id,
        span_id
      )
      VALUES ($1, $2::timestamptz, $3, $4, $5, $6::jsonb, $7, $8)
    `,
    [
      crypto.randomUUID(),
      logRecord.timestamp,
      logRecord.severity_text,
      logRecord.severity_number,
      logRecord.body,
      JSON.stringify(logRecord.attributes),
      logRecord.trace_id ?? null,
      logRecord.span_id ?? null,
    ],
  )
}
