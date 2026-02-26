import { context, trace } from '@opentelemetry/api'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogAttributes = Record<string, unknown>

const severityMap: Record<LogLevel, { text: string; number: number }> = {
  debug: { text: 'DEBUG', number: 5 },
  info: { text: 'INFO', number: 9 },
  warn: { text: 'WARN', number: 13 },
  error: { text: 'ERROR', number: 17 },
}

const serviceName = process.env.OTEL_SERVICE_NAME || 'i-revenue-api'

function getTraceContext() {
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
  const logRecord = {
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
