import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiError } from '@/lib/utils/errors'

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed.',
        issues: error.flatten(),
      },
      { status: 400 },
    )
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
      },
      { status: error.status },
    )
  }

  return NextResponse.json(
    {
      error: 'Internal server error.',
    },
    { status: 500 },
  )
}
