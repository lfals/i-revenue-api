export type ApiErrorItem = {
  code: string
  message: string
  path?: string
}

export const buildErrorResponse = (
  status: number,
  message: string,
  errors: ApiErrorItem[] = [],
) => ({
  success: false,
  status,
  message,
  errors,
})

