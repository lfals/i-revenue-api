export const ERROR_CODES = {
  APP_ERROR: 'app_error',
  USER_ALREADY_EXISTS: 'user_already_exists',
  EMAIL_ALREADY_EXISTS: 'email_already_exists',
  REGISTER_FAILED: 'register_failed',
  INVALID_CREDENTIALS: 'invalid_credentials',
  LOGIN_FAILED: 'login_failed',
  TOKEN_GENERATION_FAILED: 'token_generation_failed',
  INVALID_TOKEN: 'invalid_token',
  MISSING_TOKEN: 'missing_token',
  NOT_FOUND: 'not_found',
  INTERNAL_ERROR: 'internal_error',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
