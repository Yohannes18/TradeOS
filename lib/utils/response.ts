/**
 * Standardised API response helpers.
 * Ensures consistent JSON shape across all API routes.
 *
 * Success: { ok: true,  data: T }
 * Error:   { ok: false, error: { code, message, details? } }
 */
export function apiSuccess<T>(data: T, status = 200): Response {
  return Response.json({ ok: true, data }, { status })
}

export function apiError(
  code: string,
  message: string,
  status = 500,
  details?: unknown
): Response {
  return Response.json(
    { ok: false, error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status }
  )
}
