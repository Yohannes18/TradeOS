import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBetterAuthInstance } from '@/lib/auth/better-auth'
import { isBetterAuthEnabled } from '@/lib/auth/config'

export async function POST(request: NextRequest) {
  try {
    if (isBetterAuthEnabled) {
      const auth = getBetterAuthInstance()
      if (!auth) {
        return NextResponse.json({ refreshed: false, error: 'Better Auth is unavailable.' }, { status: 503 })
      }

      const session = await auth.api.getSession({ headers: request.headers } as never)
      const hasSession =
        Boolean((session as { user?: unknown })?.user) ||
        Boolean((session as { data?: { user?: unknown } })?.data?.user) ||
        Boolean((session as { session?: { user?: unknown } })?.session?.user)

      return NextResponse.json({ refreshed: hasSession })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      return NextResponse.json({ refreshed: false, error: error.message }, { status: 401 })
    }

    return NextResponse.json({ refreshed: Boolean(user) })
  } catch (error) {
    return NextResponse.json(
      {
        refreshed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
