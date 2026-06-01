// AI streaming functions for API routes (server-only).
// Utilities (CARD_PROMPT, extractJson, CardRaw) live in ai-utils.ts to avoid
// pulling AI SDK imports into routes that only need the parser.

import { CARD_PROMPT } from './ai-utils'

export async function streamGemini(word: string, num: number): Promise<ReadableStream<Uint8Array>> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  const model = client.getGenerativeModel({
    model: process.env.AI_MODEL || 'gemini-1.5-flash',
  })
  const result = await model.generateContentStream(CARD_PROMPT(word, num))
  const enc = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const t = chunk.text()
        if (t) controller.enqueue(enc.encode(t))
      }
      controller.close()
    },
  })
}

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
  const provider = process.env.AI_PROVIDER || 'gemini'
  if (provider === 'openai') return streamOpenAI(word, num)
  if (provider === 'anthropic') return streamClaude(word, num)
  return streamGemini(word, num)
}
