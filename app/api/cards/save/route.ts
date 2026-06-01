import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { extractJson, type CardRaw } from '@/lib/ai-utils'

// POST /api/cards/save
// Body: { word: string, rawText: string }
// Parses the AI output, saves cards to DB, returns saved records
export async function POST(req: NextRequest) {
  const { word, rawText } = (await req.json()) as { word: string; rawText: string }

  let parsed: CardRaw[]
  try {
    parsed = extractJson(rawText)
  } catch {
    return NextResponse.json({ error: 'Could not parse AI output as JSON' }, { status: 422 })
  }

  if (!parsed.length) {
    return NextResponse.json({ error: 'AI returned 0 cards' }, { status: 422 })
  }

  const rows = parsed.map((c) => ({
    target_word: word,
    front: c.front ?? '',
    back_furigana: c.back_furigana ?? '',
    back_definition: c.back_definition ?? '',
  }))

  const db = createServerClient()
  const { data, error } = await db.from('generated_cards').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ saved: data ?? [], count: data?.length ?? 0 })
}
