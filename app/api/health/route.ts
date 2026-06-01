import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const checks = {
    supabase_url: url ?? 'MISSING',
    supabase_url_valid: url
      ? !url.includes('/rest/v1') && url.startsWith('https://')
      : false,
    service_key_set: !!serviceKey,
    service_key_length: serviceKey?.length ?? 0,
    google_ai_key_set: !!process.env.GOOGLE_AI_API_KEY,
    ai_provider: process.env.AI_PROVIDER ?? 'gemini (default)',
    ai_model: process.env.AI_MODEL ?? 'gemini-1.5-flash (default)',
    db_connection: 'pending' as string,
    db_error: null as string | null,
  }

  // Test actual DB connection
  try {
    const db = createServerClient()
    const { error } = await db.from('knowledge').select('id').limit(1)
    checks.db_connection = error ? 'failed' : 'ok'
    checks.db_error = error?.message ?? null
  } catch (err: unknown) {
    checks.db_connection = 'exception'
    checks.db_error = err instanceof Error ? err.message : String(err)
  }

  const allOk = checks.supabase_url_valid && checks.service_key_set && checks.db_connection === 'ok'
  return NextResponse.json(checks, { status: allOk ? 200 : 500 })
}
