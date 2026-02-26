export type AppErrorDetail = {
  code: string
  message: string
  path?: string
}

export class AppError extends Error {
  status: number
  code: string
  details: AppErrorDetail[]
  headers?: Record<string, string>

  constructor(
    status: number,
    message: string,
    code = 'app_error',
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
