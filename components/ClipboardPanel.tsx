'use client'

import { useState } from 'react'
import { tokenizeJapanese, isJapanese } from '@/lib/tokenizer'
import { extractJson } from '@/lib/ai'

interface Props {
  onCardsGenerated: () => void
}

type WordState = { word: string; selected: boolean }
type GenState = 'idle' | 'generating' | 'saving'

export default function ClipboardPanel({ onCardsGenerated }: Props) {
  const [text, setText] = useState('')
  const [words, setWords] = useState<WordState[]>([])
  const [numSentences, setNumSentences] = useState(10)
  const [genState, setGenState] = useState<GenState>('idle')
  const [currentWord, setCurrentWord] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [log, setLog] = useState<string[]>([])

  async function readClipboard() {
    try {
      const t = await navigator.clipboard.readText()
      setText(t)
      analyzeText(t)
    } catch {
      setLog(['Could not read clipboard. Use HTTPS or paste manually.'])
    }
  }

  function analyzeText(t = text) {
    if (!t.trim()) return
    const tokens = tokenizeJapanese(t)
    setWords(tokens.map((w) => ({ word: w, selected: false })))
    setLog([])
  }

  async function filterUnknown() {
    if (!words.length) return
    const wordList = words.map((w) => w.word)
    const res = await fetch('/api/knowledge/unknown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words: wordList }),
    })
    const data = await res.json()
    const unknownSet = new Set<string>(data.unknown ?? [])
    setWords((prev) =>
      prev.filter((w) => unknownSet.has(w.word)).map((w) => ({ ...w, selected: true }))
    )
    setLog([`Showing ${unknownSet.size} unknown words`])
  }

  function toggleWord(word: string) {
    setWords((prev) =>
      prev.map((w) => (w.word === word ? { ...w, selected: !w.selected } : w))
    )
  }

  function selectAll()  { setWords((p) => p.map((w) => ({ ...w, selected: true }))) }
  function selectNone() { setWords((p) => p.map((w) => ({ ...w, selected: false }))) }

  async function generateCards() {
    const selected = words.filter((w) => w.selected).map((w) => w.word)
    if (!selected.length) { setLog(['Select at least one word.']); return }

    setGenState('generating')
    setProgress({ done: 0, total: selected.length })
    setLog([])

    for (const word of selected) {
      setCurrentWord(word)
      setLog((l) => [...l, `Generating: ${word}…`])

      try {
        // 1. Stream AI response
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

        // 2. Save parsed cards to DB
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
    }

    setGenState('idle')
    setCurrentWord('')
  }

  const selectedCount = words.filter((w) => w.selected).length
  const busy = genState !== 'idle'

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-blue text-xs font-semibold tracking-widest uppercase">Clipboard Input</span>
      </div>

      {/* Main area: textarea + word list side by side */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left: text input */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" onClick={readClipboard}>
              Read Clipboard
            </button>
            <button className="btn-secondary text-sm" onClick={() => analyzeText()}>
              Analyze
            </button>
            <button className="btn-secondary text-sm" onClick={filterUnknown} disabled={!words.length}>
              Filter Unknown
            </button>
          </div>
          <textarea
            className="input flex-1 resize-none jp-text text-base"
            placeholder="Copy Japanese text anywhere on your system… or paste / type here."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {/* Right: word list */}
        <div className="flex flex-col gap-2 w-56 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-subtle text-xs">Words found</span>
            <span className="text-muted text-xs">{words.length}</span>
          </div>
          <div className="flex gap-1">
            <button className="btn-ghost text-xs px-2 py-1" onClick={selectAll}>All</button>
            <button className="btn-ghost text-xs px-2 py-1" onClick={selectNone}>None</button>
          </div>
          <div className="flex-1 overflow-y-auto rounded-lg border border-surface bg-mantle">
            {words.length === 0 ? (
              <div className="p-3 text-center text-muted text-xs">No words yet</div>
            ) : (
              words.map(({ word, selected }) => (
                <button
                  key={word}
                  onClick={() => toggleWord(word)}
                  className={`w-full text-left px-3 py-2 jp-text text-sm transition-colors
                    ${selected
                      ? 'bg-blue/20 text-blue'
                      : 'text-subtle hover:bg-surface/50'
                    }`}
                >
                  {selected ? '✓ ' : '○ '}{word}
                </button>
              ))
            )}
          </div>
          <span className="text-xs text-muted text-center">{selectedCount} selected</span>
        </div>
      </div>

      {/* Generation controls */}
      <div className="border-t border-surface pt-3 flex items-center gap-3">
        <label className="text-subtle text-sm whitespace-nowrap">Sentences/word:</label>
        <input
          type="number"
          min={1}
          max={20}
          value={numSentences}
          onChange={(e) => setNumSentences(Number(e.target.value))}
          className="input w-16 text-center py-1"
          disabled={busy}
        />
        <div className="flex-1" />
        <button
          className="btn-success"
          onClick={generateCards}
          disabled={busy || selectedCount === 0}
        >
          {busy
            ? `${genState === 'saving' ? 'Saving' : 'Generating'} ${currentWord}…`
            : `Generate Cards for ${selectedCount} word${selectedCount !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Progress + log */}
      {busy && (
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-blue transition-all duration-300"
            style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
          />
        </div>
      )}
      {log.length > 0 && (
        <div className="bg-mantle rounded-lg border border-surface p-3 space-y-1 max-h-28 overflow-y-auto">
          {log.map((l, i) => (
            <p key={i} className="text-xs font-mono text-subtle">{l}</p>
          ))}
        </div>
      )}
    </div>
  )
}
