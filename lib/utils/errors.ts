/**
 * Domain error classes for structured error handling.
 *
 * Usage in API routes:
 *   } catch (err) {
 *     if (err instanceof DomainError)
 *       return apiError(err.code, err.message, err.httpStatus)
 *     console.error('[route]', err)
 *     return apiError('INTERNAL_ERROR', 'Unexpected error', 500)
 *   }
 */

export type ErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UNAUTHENTICATED'
  | 'VALIDATION_ERROR'
  | 'INVALID_STATE'
  | 'DUPLICATE'
  | 'SETTINGS_MISSING'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED'
  | 'CSRF_VIOLATION'

const HTTP_STATUS: Record<ErrorCode, number> = {
  NOT_FOUND: 404, FORBIDDEN: 403, UNAUTHENTICATED: 401,
  VALIDATION_ERROR: 400, INVALID_STATE: 422, DUPLICATE: 409,
  SETTINGS_MISSING: 412, INTERNAL_ERROR: 500,
  RATE_LIMITED: 429, CSRF_VIOLATION: 403,
}

export class DomainError extends Error {
  public readonly code: ErrorCode
  public readonly httpStatus: number
  constructor(code: ErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.httpStatus = HTTP_STATUS[code] ?? 500
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(`Database error: ${message}`)
    this.name = 'DatabaseError'
  }
}
