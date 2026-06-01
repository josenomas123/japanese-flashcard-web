import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
import { parseVocabFile } from '@/lib/knowledge-parser'

// POST /api/knowledge/import  — multipart form with field "file"
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const content = await file.text()
  const { records, source } = parseVocabFile(content, file.name)

  if (records.length === 0) {
    return NextResponse.json({ error: 'No vocabulary found in file' }, { status: 400 })
  }

  const db = createServerClient()
  let added = 0
  let skipped = 0

  // Batch upsert (ignore duplicates via ON CONFLICT DO NOTHING)
  const rows = records.map((r) => ({
    word: r.word,
    reading: r.reading,
    meaning: r.meaning,
    source,
  }))

  // Supabase doesn't support "ignore duplicates" directly in one call,
  // so we upsert with ignoreDuplicates: true
  const { data, error } = await db
    .from('knowledge')
    .upsert(rows, { onConflict: 'word', ignoreDuplicates: true })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  added = data?.length ?? 0
  skipped = records.length - added

  return NextResponse.json({ added, skipped, total: records.length })
}
