import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerClient } from '@/lib/supabase'
import { BATCH_PROMPT, extractJson, type BatchCardRaw } from '@/lib/ai-utils'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { count = 10, level = 'mixed' } = (await req.json()) as {
      count?: number
      level?: string
    }

    const safeCount = Math.min(Math.max(Number(count), 1), 20)
    const db = createServerClient()

    // Fetch a sample of known words to give the AI context
    const { data: knownRows } = await db
      .from('knowledge')
      .select('word')
      .order('added_at', { ascending: false })
      .limit(400)

    const knownWords = (knownRows ?? []).map((r) => r.word)
    const knownSet = new Set(knownWords)

    // Generate with Gemini
    const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
    const model = client.getGenerativeModel({
      model: process.env.AI_MODEL || 'gemini-1.5-flash',
    })

    const prompt = BATCH_PROMPT(safeCount, level, knownWords.slice(0, 300))
    const result = await model.generateContent(prompt)
    const rawText = result.response.text()

    // Parse JSON response
    let cards: BatchCardRaw[]
    try {
      cards = extractJson(rawText) as BatchCardRaw[]
    } catch {
      return NextResponse.json(
        { error: 'Could not parse AI response. Try again.' },
        { status: 422 }
      )
    }

    // Filter out words already in knowledge base
    const newCards = cards.filter(
      (c) => c.word && !knownSet.has(c.word)
    )

    // Double-check against DB for words not in our initial sample
    const wordList = newCards.map((c) => c.word)
    const { data: existingRows } = await db
      .from('knowledge')
      .select('word')
      .in('word', wordList)

    const existingSet = new Set((existingRows ?? []).map((r) => r.word))
    const finalCards = newCards.filter((c) => !existingSet.has(c.word))

    if (finalCards.length === 0) {
      return NextResponse.json({
        error: 'All generated words are already in your knowledge base. Try again.',
        generated: cards.length,
        filtered: cards.length,
        saved: [],
        count: 0,
      })
    }

    // Save to DB
    const rows = finalCards.map((c) => ({
      target_word: c.word,
      front: c.front ?? '',
      back_furigana: c.back_furigana ?? '',
      back_definition: c.back_definition ?? '',
    }))

    const { data: saved, error: saveError } = await db
      .from('generated_cards')
      .insert(rows)
      .select()

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    return NextResponse.json({
      saved: saved ?? [],
      count: saved?.length ?? 0,
      generated: cards.length,
      filtered: cards.length - finalCards.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
