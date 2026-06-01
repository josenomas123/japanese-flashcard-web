import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/cards?filter=all|pending|exported
export async function GET(req: NextRequest) {
  const db = createServerClient()
  const filter = req.nextUrl.searchParams.get('filter') ?? 'all'

  let query = db.from('generated_cards').select('*').order('created_at', { ascending: false })
  if (filter === 'pending') query = query.eq('exported', false)
  if (filter === 'exported') query = query.eq('exported', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cards: data ?? [] })
}

// DELETE /api/cards
// Body: { ids: number[] }
export async function DELETE(req: NextRequest) {
  const { ids } = (await req.json()) as { ids: number[] }
  if (!ids?.length) return NextResponse.json({ deleted: 0 })

  const db = createServerClient()
  const { error, count } = await db.from('generated_cards').delete().in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: count ?? 0 })
}

// PATCH /api/cards  — mark as exported
// Body: { ids: number[] }
export async function PATCH(req: NextRequest) {
  const { ids } = (await req.json()) as { ids: number[] }
  if (!ids?.length) return NextResponse.json({ updated: 0 })

  const db = createServerClient()
  const { error, count } = await db
    .from('generated_cards')
    .update({ exported: true })
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: count ?? 0 })
}
