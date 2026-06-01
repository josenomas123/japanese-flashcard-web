// Client-side AnkiConnect — fetches directly to localhost:8765 from the browser.
// This works because AnkiConnect allows CORS from any origin by default.

const ANKI_URL = 'http://localhost:8765'
const NOTE_TYPE = 'JapaneseSentenceMining'
const NOTE_FIELDS = ['Front', 'Back - Pitch/Furigana', 'Back - Definition']

async function invoke<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ANKI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: 6, params }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.result as T
}

export async function checkConnection(): Promise<boolean> {
  try { await invoke('version'); return true }
  catch { return false }
}

export async function getDecks(): Promise<string[]> {
  return invoke<string[]>('deckNames')
}

async function ensureNoteType(): Promise<void> {
  const existing = await invoke<string[]>('modelNames')
  if (existing.includes(NOTE_TYPE)) return
  await invoke('createModel', {
    modelName: NOTE_TYPE,
    inOrderFields: NOTE_FIELDS,
    cardTemplates: [{
      Name: 'Card 1',
      Front: '{{Front}}',
      Back: '{{FrontSide}}<hr>{{Back - Pitch/Furigana}}<br><br>{{Back - Definition}}',
    }],
  })
}

export interface CardPayload {
  front: string
  back_furigana: string
  back_definition: string
}

export async function addNotesBatch(deck: string, cards: CardPayload[]): Promise<(number | null)[]> {
  await ensureNoteType()
  const notes = cards.map((c) => ({
    deckName: deck,
    modelName: NOTE_TYPE,
    fields: {
      'Front': c.front,
      'Back - Pitch/Furigana': c.back_furigana,
      'Back - Definition': c.back_definition,
    },
    options: { allowDuplicate: false },
    tags: ['sentence-mining'],
  }))
  return invoke<(number | null)[]>('addNotes', { notes })
}
