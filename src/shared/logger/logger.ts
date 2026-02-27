import { context, trace } from '@opentelemetry/api'
import { env } from '../../config/env'
import { persistLogRecord, type LogAttributes, type LogRecordPayload } from './postgres-log-store'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const severityMap: Record<LogLevel, { text: string; number: number }> = {
  debug: { text: 'DEBUG', number: 5 },
  info: { text: 'INFO', number: 9 },
  warn: { text: 'WARN', number: 13 },
  error: { text: 'ERROR', number: 17 },
}

const shouldPersistLogs = Boolean(env.DATABASE_URL)

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

function write(level: LogLevel, body: string, attributes: LogAttributes = {}) {
  const severity = severityMap[level]
  const logRecord: LogRecordPayload = {
    timestamp: new Date().toISOString(),
    severity_text: severity.text,
    severity_number: severity.number,
    body,
    attributes: {
      'service.name': env.OTEL_SERVICE_NAME,
      ...attributes,
    },
    ...getTraceContext(),
  }

  const serialized = JSON.stringify(logRecord)
  if (shouldPersistLogs) {
    void persistLogRecord(logRecord).catch((error) => {
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
    })
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
