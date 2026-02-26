import type { ErrorCode } from './error-codes'
import { ERROR_CODES } from './error-codes'

export type AppErrorDetail = {
  code: ErrorCode
  message: string
  path?: string
}

export class AppError extends Error {
  status: number
  code: ErrorCode
  details: AppErrorDetail[]
  headers?: Record<string, string>

  constructor(
    status: number,
    message: string,
    code: ErrorCode = ERROR_CODES.APP_ERROR,
    details: AppErrorDetail[] = [],
    headers?: Record<string, string>,
  ) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
    this.headers = headers
  }
}
