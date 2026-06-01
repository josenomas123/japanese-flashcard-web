import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/knowledge?search=xxx
export async function GET(req: NextRequest) {
  const db = createServerClient()
  const search = req.nextUrl.searchParams.get('search') ?? ''

  let query = db.from('knowledge').select('*').order('added_at', { ascending: false })
  if (search) {
    query = query.or(`word.ilike.%${search}%,reading.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ words: data ?? [], count: data?.length ?? 0 })
}

// DELETE /api/knowledge  — reset all
export async function DELETE() {
  const db = createServerClient()
  const { error, count } = await db.from('knowledge').delete().neq('id', 0)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: count ?? 0 })
}
