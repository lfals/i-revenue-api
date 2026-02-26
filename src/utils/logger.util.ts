import { context, trace } from '@opentelemetry/api'
import { sql } from 'drizzle-orm'
import { db } from '../db/client'
import { logsTable } from '../db/schema'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogAttributes = Record<string, unknown>

const severityMap: Record<LogLevel, { text: string; number: number }> = {
  debug: { text: 'DEBUG', number: 5 },
  info: { text: 'INFO', number: 9 },
  warn: { text: 'WARN', number: 13 },
  error: { text: 'ERROR', number: 17 },
}

const serviceName = process.env.OTEL_SERVICE_NAME || 'i-revenue-api'
const shouldPersistLogs = process.env.NODE_ENV === 'production'

function getTraceContext(): { trace_id?: string; span_id?: string } {
  const span = trace.getSpan(context.active())
  const spanContext = span?.spanContext()

  if (!spanContext?.traceId || !spanContext?.spanId) {
    return {}
  }

  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
  }
}

type LogRecordPayload = {
  timestamp: string
  severity_text: string
  severity_number: number
  body: string
  attributes: LogAttributes
  trace_id?: string
  span_id?: string
}

let logTableReady: Promise<void> | null = null

async function ensureLogsTable() {
  if (!logTableReady) {
    logTableReady = db
      .run(sql`
        CREATE TABLE IF NOT EXISTS logs_table (
          id TEXT PRIMARY KEY NOT NULL,
          timestamp TEXT NOT NULL,
          severity_text TEXT NOT NULL,
          severity_number INTEGER NOT NULL,
          body TEXT NOT NULL,
          attributes TEXT NOT NULL,
          trace_id TEXT,
          span_id TEXT,
          createdAt TEXT DEFAULT (CURRENT_TIMESTAMP)
        )
      `)
      .then(() => undefined)
  }

  return logTableReady
}

async function persistLogRecord(logRecord: LogRecordPayload) {
  try {
    await ensureLogsTable()
    await db.insert(logsTable).values({
      timestamp: logRecord.timestamp,
      severityText: logRecord.severity_text,
      severityNumber: logRecord.severity_number,
      body: logRecord.body,
      attributes: JSON.stringify(logRecord.attributes),
      traceId: logRecord.trace_id ?? null,
      spanId: logRecord.span_id ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error'
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        severity_text: 'ERROR',
        severity_number: 17,
        body: 'log.persist.failed',
        attributes: { message },
      }),
    )
  }
}

function write(level: LogLevel, body: string, attributes: LogAttributes = {}) {
  const severity = severityMap[level]
  const logRecord: LogRecordPayload = {
    timestamp: new Date().toISOString(),
    severity_text: severity.text,
    severity_number: severity.number,
    body,
    attributes: {
      'service.name': serviceName,
      ...attributes,
    },
    ...getTraceContext(),
  }

  const serialized = JSON.stringify(logRecord)
  if (shouldPersistLogs) {
    void persistLogRecord(logRecord)
  }

  if (level === 'error' || level === 'warn') {
    console.error(serialized)
    return
  }

  console.log(serialized)
}

export const logger = {
  debug: (body: string, attributes?: LogAttributes) => write('debug', body, attributes),
  info: (body: string, attributes?: LogAttributes) => write('info', body, attributes),
  warn: (body: string, attributes?: LogAttributes) => write('warn', body, attributes),
  error: (body: string, attributes?: LogAttributes) => write('error', body, attributes),
}
