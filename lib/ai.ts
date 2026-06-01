// Prompt builder and AI client factory for API routes (server-only)

export const CARD_PROMPT = (word: string, num: number) => `\
You are a Japanese sentence-mining assistant. Generate flashcard sentences for Anki.

TARGET WORD: ${word}

STRICT RULES:
1. Generate exactly ${num} Japanese example sentences.
2. Each sentence must contain EXACTLY ONE word a learner wouldn't know: "${word}".
3. All other vocabulary must be very common (JLPT N5–N4 level or basic everyday words).
4. Sentences must be natural, conversational Japanese — no academic phrasing.
5. Vary sentence structures and contexts. Do NOT repeat the same structure.

OUTPUT FORMAT — return a valid JSON array only, no markdown fences.
Each element must have EXACTLY these three fields:

"front"           — The Japanese sentence as plain text. Mark the target word as 【${word}】.
"back_furigana"   — Full sentence with HTML <ruby> tags for all kanji readings.
                    Then on a new line (use <br>), bold the word with its pitch accent:
                    <b>${word}</b>【reading in hiragana】(Pitch: LHL)
"back_definition" — HTML-formatted English definition:
                    <b>${word}【reading】</b><br><i>part of speech</i><br>
                    ① meaning one<br>② meaning two (if any)<br>JLPT Nx

EXAMPLE (word: 映画):
[
  {
    "front": "昨日、友達と【映画】を見た。",
    "back_furigana": "昨日、<ruby>友達<rt>ともだち</rt></ruby>と<ruby>映画<rt>えいが</rt></ruby>を<ruby>見<rt>み</rt></ruby>た。<br><b>映画</b>【えいが】(Pitch: LHL)",
    "back_definition": "<b>映画【えいが】</b><br><i>noun</i><br>① movie, film, cinema<br>JLPT N4"
  }
]

Generate ${num} sentences for: ${word}
`

export type CardRaw = {
  front: string
  back_furigana: string
  back_definition: string
}

export function extractJson(text: string): CardRaw[] {
  const clean = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim()
  const start = clean.indexOf('[')
  const end = clean.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('No JSON array in response')
  return JSON.parse(clean.slice(start, end + 1))
}

// ── Streaming helpers ─────────────────────────────────────────────────────────

export async function streamClaude(word: string, num: number): Promise<ReadableStream<Uint8Array>> {
  const { default: Anthropic } = await import('anthropic')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  const stream = client.messages.stream({
    model: process.env.AI_MODEL || 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: CARD_PROMPT(word, num) }],
  })

  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      stream.on('text', (t) => controller.enqueue(enc.encode(t)))
      stream.on('finalMessage', () => controller.close())
      stream.on('error', (e) => controller.error(e))
    },
  })
}

export async function streamOpenAI(word: string, num: number): Promise<ReadableStream<Uint8Array>> {
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

  const aiStream = await client.chat.completions.create({
    model: process.env.AI_MODEL || 'gpt-4o',
    max_tokens: 4096,
    messages: [{ role: 'user', content: CARD_PROMPT(word, num) }],
    stream: true,
  })

  const enc = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of aiStream) {
        const t = chunk.choices[0]?.delta?.content
        if (t) controller.enqueue(enc.encode(t))
      }
      controller.close()
    },
  })
}

export async function getStream(word: string, num: number): Promise<ReadableStream<Uint8Array>> {
  const provider = process.env.AI_PROVIDER || 'anthropic'
  return provider === 'openai' ? streamOpenAI(word, num) : streamClaude(word, num)
}
