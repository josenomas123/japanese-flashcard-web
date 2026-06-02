'use client'

import { useState } from 'react'

interface Props {
  onCardsGenerated: () => void
}

type Status = 'idle' | 'generating' | 'done' | 'error'

const LEVEL_OPTIONS = [
  { value: 'N5', label: 'N5', desc: 'Beginner' },
  { value: 'N4', label: 'N4', desc: 'Elementary' },
  { value: 'N3', label: 'N3', desc: 'Intermediate' },
  { value: 'N2', label: 'N2', desc: 'Upper-Intermediate' },
  { value: 'N1', label: 'N1', desc: 'Advanced' },
  { value: 'mixed', label: 'Mixed', desc: 'N3–N1 variety' },
]

const COUNT_PRESETS = [5, 10, 15, 20]

export default function BatchPanel({ onCardsGenerated }: Props) {
  const [count, setCount] = useState(10)
  const [level, setLevel] = useState('mixed')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<{
    count: number
    filtered: number
    generated: number
  } | null>(null)
  const [error, setError] = useState('')

  async function generate() {
    setStatus('generating')
    setResult(null)
    setError('')

    try {
      const res = await fetch('/api/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, level }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? 'Unknown error')
        setStatus('error')
        return
      }

      setResult({ count: data.count, filtered: data.filtered, generated: data.generated })
      setStatus('done')
      onCardsGenerated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error')
      setStatus('error')
    }
  }

  const busy = status === 'generating'

  return (
    <div className="flex flex-col gap-6 h-full max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <span className="text-blue text-xs font-semibold tracking-widest uppercase">Auto Generate</span>
        <p className="text-subtle text-sm mt-1">
          The AI picks vocabulary you don't know yet and builds flashcards automatically.
          Words already in your Knowledge Base are skipped.
        </p>
      </div>

      {/* Level selector */}
      <div className="space-y-2">
        <label className="text-subtle text-xs font-semibold uppercase tracking-wider">JLPT Level</label>
        <div className="flex flex-wrap gap-2">
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLevel(opt.value)}
              disabled={busy}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                ${level === opt.value
                  ? 'bg-blue text-crust border-blue'
                  : 'border-surface text-subtle hover:border-overlay hover:text-text'}`}
            >
              <span className="font-bold">{opt.label}</span>
              <span className="ml-1.5 text-xs opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Count selector */}
      <div className="space-y-3">
        <label className="text-subtle text-xs font-semibold uppercase tracking-wider">
          Number of Flashcards
        </label>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {COUNT_PRESETS.map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                disabled={busy}
                className={`w-12 h-10 rounded-lg border text-sm font-bold transition-colors
                  ${count === n
                    ? 'bg-blue text-crust border-blue'
                    : 'border-surface text-subtle hover:border-overlay hover:text-text'}`}
              >
                {n}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value))))}
            disabled={busy}
            className="input w-20 text-center font-bold text-lg"
          />
          <span className="text-muted text-sm">max 20</span>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={busy}
        className="btn-success w-full py-3 text-base font-bold rounded-xl"
      >
        {busy
          ? `Generating ${count} flashcards…`
          : `Generate ${count} Flashcards`}
      </button>

      {/* Progress animation */}
      {busy && (
        <div className="space-y-3">
          <div className="h-1.5 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-blue rounded-full animate-pulse w-2/3" />
          </div>
          <p className="text-subtle text-sm text-center">
            Asking Gemini to pick {count} {level === 'mixed' ? 'N3–N1' : level} words you don't know yet…
          </p>
        </div>
      )}

      {/* Result */}
      {status === 'done' && result && (
        <div className="bg-green/10 border border-green/30 rounded-xl p-5 space-y-1">
          <p className="text-green font-bold text-lg">
            ✓ {result.count} flashcard{result.count !== 1 ? 's' : ''} generated
          </p>
          {result.filtered > 0 && (
            <p className="text-subtle text-sm">
              {result.filtered} word{result.filtered !== 1 ? 's were' : ' was'} already in your
              Knowledge Base and skipped.
            </p>
          )}
          <p className="text-muted text-sm">
            Cards are ready in the <b className="text-text">Generated Cards</b> tab.
          </p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="bg-red/10 border border-red/30 rounded-xl p-4">
          <p className="text-red font-semibold">Generation failed</p>
          <p className="text-subtle text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Info box */}
      <div className="mt-auto bg-mantle border border-surface rounded-xl p-4 text-sm text-muted space-y-1">
        <p>• The AI reads your Knowledge Base to avoid words you already know.</p>
        <p>• Each card has one natural example sentence for sentence mining.</p>
        <p>• Maximum 20 cards per generation (Vercel timeout limit).</p>
      </div>
    </div>
  )
}
