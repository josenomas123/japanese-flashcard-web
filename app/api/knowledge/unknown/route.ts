import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/knowledge/unknown
// Body: { words: string[] }
// Returns: { unknown: string[] } — words NOT in the knowledge base
export async function POST(req: NextRequest) {
  const { words } = (await req.json()) as { words: string[] }
  if (!Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ unknown: [] })
  }

  const db = createServerClient()
  const { data, error } = await db
    .from('knowledge')
    .select('word')
    .in('word', words)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const known = new Set((data ?? []).map((r) => r.word))
  const unknown = words.filter((w) => !known.has(w))

  return NextResponse.json({ unknown })
}
