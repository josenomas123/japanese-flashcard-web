import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { parseVocabFile } from '@/lib/knowledge-parser'

export const dynamic = 'force-dynamic'
export const maxDuration = 60  // seconds — requires Vercel Pro for >10s; hobby gets 10s

const BATCH_SIZE = 200  // rows per Supabase upsert call

// POST /api/knowledge/import  — multipart form with field "file"
export async function POST(req: NextRequest) {
  try {
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

    // Process in batches to avoid Supabase payload limits and Vercel timeouts
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE).map((r) => ({
        word: r.word,
        reading: r.reading,
        meaning: r.meaning,
        source,
      }))

      const { data, error } = await db
        .from('knowledge')
        .upsert(batch, { onConflict: 'word', ignoreDuplicates: true })
        .select('id')

      if (error) {
        return NextResponse.json(
          { error: `Supabase error: ${error.message}`, added, total: records.length },
          { status: 500 }
        )
      }

      added += data?.length ?? 0
    }

    const skipped = records.length - added
    return NextResponse.json({ added, skipped, total: records.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
