// Client-side Japanese tokenizer — regex-based CJK extraction.
// No server round-trip or heavy deps needed.

function isCJK(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0
  return (
    (cp >= 0x3040 && cp <= 0x309f) || // hiragana
    (cp >= 0x30a0 && cp <= 0x30ff) || // katakana
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK unified
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0x3400 && cp <= 0x4dbf)
  )
}

export function tokenizeJapanese(text: string): string[] {
  const words: string[] = []
  let buf = ''

  for (const ch of text) {
    if (isCJK(ch)) {
      buf += ch
    } else {
      if (buf.length >= 2) words.push(buf)
      buf = ''
    }
  }
  if (buf.length >= 2) words.push(buf)

  return [...new Set(words)] // unique, order-preserved
}

export function isJapanese(text: string): boolean {
  return [...text].some((ch) => isCJK(ch))
}
