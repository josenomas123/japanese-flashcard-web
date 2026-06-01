import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function csvEscape(value: string): string {
  const escaped = value.replace(/"/g, '""')
  return `"${escaped}"`
}

// GET /api/cards/export?filter=pending|all
// Returns a CSV file compatible with Anki import
export async function GET(req: NextRequest) {
  const filter = req.nextUrl.searchParams.get('filter') ?? 'pending'
  const db = createServerClient()

  let query = db.from('generated_cards').select('*').order('created_at', { ascending: false })
  if (filter === 'pending') query = query.eq('exported', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ error: 'No cards to export' }, { status: 404 })

  // Anki-compatible CSV: Front, Back-Pitch/Furigana, Back-Definition
  const header = '#separator:comma\n#html:true\n'
  const rows = data
    .map((c) =>
      [
        csvEscape(c.front),
        csvEscape(c.back_furigana),
        csvEscape(c.back_definition),
      ].join(',')
    )
    .join('\n')

  const csv = header + rows + '\n'

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="flashcards.csv"',
    },
  })
}
