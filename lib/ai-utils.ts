// Pure utilities — no AI SDK imports. Safe to use in any route.

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
