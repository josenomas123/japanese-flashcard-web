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

export type BatchCardRaw = CardRaw & { word: string }

export function extractJson(text: string): CardRaw[] {
  const clean = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim()
  const start = clean.indexOf('[')
  const end = clean.lastIndexOf(']')
  if (start === -1 || end === -1) throw new Error('No JSON array in response')
  return JSON.parse(clean.slice(start, end + 1))
}

export const BATCH_PROMPT = (count: number, level: string, knownWords: string[]) => {
  const avoidList = knownWords.length
    ? `WORDS TO AVOID (already in user's knowledge base — do NOT use as target words):\n${knownWords.join('、')}\n`
    : ''
  const levelGuide =
    level === 'mixed'
      ? 'Mix of JLPT N3, N2, and N1 vocabulary.'
      : `Focus on JLPT ${level} vocabulary.`

  return `\
You are a Japanese vocabulary flashcard generator.

Generate exactly ${count} Japanese vocabulary flashcard sets.
${avoidList}
LEVEL: ${levelGuide}
Vary the vocabulary types: verbs, nouns, i-adjectives, na-adjectives, expressions.

OUTPUT FORMAT — return a valid JSON array only, no markdown fences.
Each element must have EXACTLY these four fields:

"word"            — The target Japanese word in its dictionary/kanji form.
"front"           — One natural Japanese example sentence. Mark the target word as 【word】.
                    All other vocabulary must be simple (JLPT N5–N4 level or everyday words).
"back_furigana"   — The complete sentence with HTML <ruby> tags for ALL kanji readings.
                    Then <br><b>word</b>【reading in hiragana】(Pitch: pattern)
"back_definition" — HTML definition: <b>word【reading】</b><br><i>part of speech</i><br>
                    ① meaning<br>② second meaning (if any)<br>JLPT Nx

EXAMPLE:
[
  {
    "word": "驚く",
    "front": "その知らせに【驚いた】。",
    "back_furigana": "その<ruby>知<rt>し</rt></ruby>らせに<ruby>驚<rt>おどろ</rt></ruby>いた。<br><b>驚く</b>【おどろく】(Pitch: LHHL)",
    "back_definition": "<b>驚く【おどろく】</b><br><i>verb (godan)</i><br>① to be surprised, to be astonished<br>JLPT N3"
  }
]

Generate ${count} unique flashcard sets now.`
}
