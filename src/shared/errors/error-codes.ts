export const ERROR_CODES = {
  APP_ERROR: 'app_error',
  USER_ALREADY_EXISTS: 'user_already_exists',
  EMAIL_ALREADY_EXISTS: 'email_already_exists',
  REGISTER_FAILED: 'register_failed',
  INVALID_CREDENTIALS: 'invalid_credentials',
  LOGIN_FAILED: 'login_failed',
  TOKEN_GENERATION_FAILED: 'token_generation_failed',
  TOKEN_RENEWAL_FAILED: 'token_renewal_failed',
  INVALID_TOKEN: 'invalid_token',
  INVALID_REFRESH_TOKEN: 'invalid_refresh_token',
  MISSING_TOKEN: 'missing_token',
  MISSING_REFRESH_TOKEN: 'missing_refresh_token',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  NOT_FOUND: 'not_found',
  INTERNAL_ERROR: 'internal_error',
  REVENUE_NOT_FOUND: 'revenue_not_found',
  REVENUE_CREATE_FAILED: 'revenue_create_failed',
  REVENUE_UPDATE_FAILED: 'revenue_update_failed',
  REVENUE_DELETE_FAILED: 'revenue_delete_failed',
  INVALID_REVENUE_RANGE: 'invalid_revenue_range',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
