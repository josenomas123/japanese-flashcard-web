// Parses vocabulary files into { word, reading, meaning } records.
// Supports: Anki .txt export (tab-separated), CSV, plain word list.

export interface VocabRecord {
  word: string
  reading: string
  meaning: string
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim()
}

function parseAnkiExport(content: string): VocabRecord[] {
  const lines = content.split('\n')
  let separator = '\t'
  const records: VocabRecord[] = []

  for (const line of lines) {
    if (line.startsWith('#separator:')) {
      const s = line.split(':')[1]?.trim().toLowerCase()
      separator = s === 'tab' ? '\t' : (s ?? '\t')
      continue
    }
    if (line.startsWith('#') || !line.trim()) continue

    const parts = line.split(separator)
    let word = stripHtml(parts[0] ?? '')
    let reading = stripHtml(parts[1] ?? '')
    const meaning = stripHtml(parts[2] ?? '')

    // Handle furigana format: 映画[えいが]
    const m = word.match(/^(.+?)\[(.+?)\]$/)
    if (m) { word = m[1]; reading = m[2] }

    if (word) records.push({ word, reading, meaning })
  }

  return records
}

function parseCsv(content: string): VocabRecord[] {
  const records: VocabRecord[] = []
  for (const line of content.split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue
    // Simple CSV split (handles quoted fields minimally)
    const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim())
    const word = stripHtml(parts[0] ?? '')
    if (!word) continue
    records.push({
      word,
      reading: stripHtml(parts[1] ?? ''),
      meaning: stripHtml(parts[2] ?? ''),
    })
  }
  return records
}

function parseWordList(content: string): VocabRecord[] {
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((word) => ({ word, reading: '', meaning: '' }))
}

export function parseVocabFile(content: string, filename: string): { records: VocabRecord[]; source: string } {
  const lines = content.split('\n').slice(0, 10)
  const hasAnkiHeader = lines.some((l) => l.startsWith('#separator') || l.startsWith('#html'))
  const ext = filename.split('.').pop()?.toLowerCase()

  if (hasAnkiHeader || ext === 'txt') {
    return { records: parseAnkiExport(content), source: 'anki' }
  }
  if (ext === 'csv') {
    return { records: parseCsv(content), source: 'csv' }
  }
  // TSV without Anki headers
  if (content.includes('\t')) {
    return { records: parseAnkiExport(content), source: 'tsv' }
  }
  return { records: parseWordList(content), source: 'wordlist' }
}
