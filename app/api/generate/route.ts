import { NextRequest } from 'next/server'
import { getStream } from '@/lib/ai'

export const runtime = 'nodejs'
export const maxDuration = 60

// POST /api/generate
// Body: { word: string, numSentences?: number }
// Response: streaming plain text (AI raw output — client parses JSON when done)
export async function POST(req: NextRequest) {
  const { word, numSentences = 10 } = (await req.json()) as {
    word: string
    numSentences?: number
  }

  if (!word?.trim()) {
    return new Response('Missing word', { status: 400 })
  }

  try {
    const stream = await getStream(word.trim(), Math.min(Math.max(numSentences, 1), 20))
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI generation failed'
    return new Response(msg, { status: 500 })
  }
}
