// AI streaming — Gemini only.
// Static import so Next.js serverExternalPackages can handle it correctly.
import { GoogleGenerativeAI } from '@google/generative-ai'
import { CARD_PROMPT } from './ai-utils'

export async function getStream(word: string, num: number): Promise<ReadableStream<Uint8Array>> {
  const client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  const model = client.getGenerativeModel({
    model: process.env.AI_MODEL || 'gemini-2.0-flash-lite',
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
