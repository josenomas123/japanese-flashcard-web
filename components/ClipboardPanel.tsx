'use client'

import { useRef, useState } from 'react'
import { tokenizeJapanese } from '@/lib/tokenizer'

interface Props {
  onCardsGenerated: () => void
}

type GenState = 'idle' | 'generating' | 'saving'

interface WordEntry {
  word: string
  selected: boolean
}

export default function ClipboardPanel({ onCardsGenerated }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [selectedWord, setSelectedWord] = useState('')
  const [unknownWords, setUnknownWords] = useState<WordEntry[]>([])
  const [numSentences, setNumSentences] = useState(10)
  const [genState, setGenState] = useState<GenState>('idle')
  const [currentWord, setCurrentWord] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [log, setLog] = useState<string[]>([])

  // ── Word selection detection ────────────────────────────────────────────────
  function captureSelection() {
    const ta = textareaRef.current
    if (!ta) return
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd).trim()
    // Accept selections up to 20 chars (covers most Japanese words + phrases)
    if (sel.length > 0 && sel.length <= 20) {
      setSelectedWord(sel)
    }
  }

  // ── Clipboard ───────────────────────────────────────────────────────────────
  async function pasteClipboard() {
    try {
      const t = await navigator.clipboard.readText()
      setText(t)
      textareaRef.current?.focus()
    } catch {
      setLog(['Could not read clipboard — use HTTPS or paste manually (Ctrl+V).'])
    }
  }

  // ── Analyze unknown words ───────────────────────────────────────────────────
  async function analyzeUnknown() {
    if (!text.trim()) return
    const tokens = tokenizeJapanese(text)
    if (!tokens.length) {
      setUnknownWords([])
      setLog(['No Japanese words detected.'])
      return
    }
    const res = await fetch('/api/knowledge/unknown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words: tokens }),
    })
    const data = await res.json()
    const unknown: string[] = data.unknown ?? []
    setUnknownWords(unknown.map((w) => ({ word: w, selected: true })))
    setLog([`Found ${unknown.length} unknown word${unknown.length !== 1 ? 's' : ''} out of ${tokens.length} detected.`])
  }

  // ── Core: generate card(s) for a list of words ──────────────────────────────
  async function generateForWords(words: string[]) {
    if (!words.length) return
    setGenState('generating')
    setProgress({ done: 0, total: words.length })
    setLog([])

    for (const word of words) {
      setCurrentWord(word)
      setLog((l) => [...l, `Generating: ${word}…`])
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, numSentences }),
        })
        if (!res.ok) throw new Error(await res.text())

        const reader = res.body!.getReader()
        const dec = new TextDecoder()
        let rawText = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          rawText += dec.decode(value, { stream: true })
        }

        setGenState('saving')
        const saveRes = await fetch('/api/cards/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word, rawText }),
        })
        const saveData = await saveRes.json()
        if (!saveRes.ok) throw new Error(saveData.error)

        setProgress((p) => ({ ...p, done: p.done + 1 }))
        setLog((l) => [...l.slice(0, -1), `✓ ${word} — ${saveData.count} cards saved`])
        onCardsGenerated()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setLog((l) => [...l.slice(0, -1), `✗ ${word}: ${msg}`])
      }
      setGenState('generating')
    }

    setGenState('idle')
    setCurrentWord('')
  }

  function generateSelected() {
    const words = unknownWords.filter((w) => w.selected).map((w) => w.word)
    generateForWords(words)
  }

  function generateQuick() {
    if (selectedWord) generateForWords([selectedWord])
  }

  function toggleWord(word: string) {
    setUnknownWords((prev) =>
      prev.map((w) => (w.word === word ? { ...w, selected: !w.selected } : w))
    )
  }

  const busy = genState !== 'idle'
  const selectedCount = unknownWords.filter((w) => w.selected).length

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* Header row */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-blue text-xs font-semibold tracking-widest uppercase">Notes</span>
        <span className="text-muted text-xs">Select any word → quick flashcard · or analyze all unknown words</span>
        <div className="flex-1" />
        <button className="btn-secondary text-xs px-3 py-1.5" onClick={pasteClipboard}>
          📋 Paste Clipboard
        </button>
      </div>

      {/* Main area */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* ── Left: Notes textarea ───────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 gap-2">

          {/* Selected word pill */}
          {selectedWord ? (
            <div className="flex items-center gap-2 bg-blue/10 border border-blue/30 rounded-lg px-3 py-2">
              <span className="text-muted text-xs">Selected:</span>
              <span className="jp-text text-blue font-bold text-lg">{selectedWord}</span>
              <button
                className="text-muted hover:text-text text-xs ml-1"
                onClick={() => setSelectedWord('')}
              >✕</button>
              <div className="flex-1" />
              <span className="text-muted text-xs">{numSentences} sentences</span>
              <button
                onClick={generateQuick}
                disabled={busy}
                className="btn-success text-sm px-4 py-1.5 disabled:opacity-40"
              >
                ⚡ Generate Card
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-mantle border border-surface rounded-lg px-3 py-2 text-muted text-xs">
              <span>💡 Double-click a word or highlight text to get a quick flashcard</span>
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="input flex-1 resize-none jp-text text-base leading-relaxed text-white caret-white"
            placeholder={
              'Paste or type Japanese text here…\n\n' +
              '• Double-click any word to select it\n' +
              '• Or highlight a word/phrase\n' +
              '• Then click ⚡ Generate Card above\n\n' +
              'You can also click Analyze to find all unknown words.'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onMouseUp={captureSelection}
            onKeyUp={captureSelection}
            onDoubleClick={captureSelection}
          />
        </div>

        {/* ── Right: Unknown words panel ─────────────────────────────────────── */}
        <div className="flex flex-col w-52 shrink-0 gap-2">
          <div className="flex items-center justify-between">
            <span className="text-subtle text-xs font-semibold uppercase tracking-wider">Unknown Words</span>
            <span className="text-muted text-xs">{unknownWords.length}</span>
          </div>

          <button
            className="btn-secondary text-xs py-1.5"
            onClick={analyzeUnknown}
            disabled={!text.trim() || busy}
          >
            Analyze Text
          </button>

          <div className="flex-1 overflow-y-auto rounded-lg border border-surface bg-mantle">
            {unknownWords.length === 0 ? (
              <div className="p-3 text-center text-muted text-xs leading-relaxed">
                Click Analyze<br />to find unknown<br />words in your text
              </div>
            ) : (
              unknownWords.map(({ word, selected }) => (
                <button
                  key={word}
                  onClick={() => toggleWord(word)}
                  className={`w-full text-left px-3 py-2 jp-text text-sm transition-colors border-b border-surface/50 last:border-0
                    ${selected ? 'bg-blue/15 text-blue' : 'text-subtle hover:bg-surface/50'}`}
                >
                  <span className="mr-1.5 text-xs">{selected ? '☑' : '☐'}</span>
                  {word}
                </button>
              ))
            )}
          </div>

          {unknownWords.length > 0 && (
            <div className="flex gap-1">
              <button
                className="btn-ghost text-xs px-2 py-1 flex-1"
                onClick={() => setUnknownWords((p) => p.map((w) => ({ ...w, selected: true })))}
              >All</button>
              <button
                className="btn-ghost text-xs px-2 py-1 flex-1"
                onClick={() => setUnknownWords((p) => p.map((w) => ({ ...w, selected: false })))}
              >None</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom controls ───────────────────────────────────────────────────── */}
      <div className="border-t border-surface pt-3 flex flex-wrap items-center gap-3 shrink-0">
        <label className="text-subtle text-sm whitespace-nowrap">Sentences/word:</label>
        <input
          type="number" min={1} max={20} value={numSentences}
          onChange={(e) => setNumSentences(Number(e.target.value))}
          className="input w-16 text-center py-1"
          disabled={busy}
        />
        <div className="flex-1" />
        <button
          className="btn-success"
          onClick={generateSelected}
          disabled={busy || selectedCount === 0}
        >
          {busy
            ? `${genState === 'saving' ? 'Saving' : 'Generating'} ${currentWord}…`
            : `Generate Cards for ${selectedCount} word${selectedCount !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Progress bar */}
      {busy && (
        <div className="h-1.5 bg-surface rounded-full overflow-hidden shrink-0">
          <div
            className="h-full bg-blue transition-all duration-300"
            style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 10}%` }}
          />
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-mantle rounded-lg border border-surface p-3 space-y-1 max-h-24 overflow-y-auto shrink-0">
          {log.map((l, i) => (
            <p key={i} className="text-xs font-mono text-subtle">{l}</p>
          ))}
        </div>
      )}
    </div>
  )
}
