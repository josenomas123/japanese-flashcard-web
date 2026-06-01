'use client'

import { useEffect, useRef, useState } from 'react'

interface Word {
  id: number
  word: string
  reading: string
  meaning: string
  source: string
  added_at: string
}

interface Props {
  onKnowledgeChange: () => void
}

export default function KnowledgePanel({ onKnowledgeChange }: Props) {
  const [words, setWords] = useState<Word[]>([])
  const [count, setCount] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchWords() }, [search])

  async function fetchWords() {
    const res = await fetch(`/api/knowledge?search=${encodeURIComponent(search)}`)
    const data = await res.json()
    setWords(data.words ?? [])
    setCount(data.count ?? 0)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setStatus('Importing…')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/knowledge/import', { method: 'POST', body: form })
    const data = await res.json()
    setLoading(false)
    if (res.ok) {
      setStatus(`✓ Added ${data.added} words, ${data.skipped} skipped`)
      fetchWords()
      onKnowledgeChange()
    } else {
      setStatus(`Error: ${data.error}`)
    }
    e.target.value = ''
  }

  async function handleReset() {
    if (!confirm(`Delete all ${count} words from the knowledge base?`)) return
    const res = await fetch('/api/knowledge', { method: 'DELETE' })
    const data = await res.json()
    setStatus(`Deleted ${data.deleted} words`)
    fetchWords()
    onKnowledgeChange()
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-blue text-xs font-semibold tracking-widest uppercase">Knowledge Base</span>
        <span className="ml-auto text-subtle text-sm">{count.toLocaleString()} words</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          className="btn-primary flex-1"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
        >
          Import File (CSV / Anki Export)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.csv,.tsv"
          className="hidden"
          onChange={handleImport}
        />
        <button className="btn-danger" onClick={handleReset} disabled={count === 0}>
          Reset
        </button>
      </div>

      {status && (
        <p className="text-xs text-subtle bg-mantle rounded px-3 py-2">{status}</p>
      )}

      {/* Search */}
      <input
        className="input"
        placeholder="Search words…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Word list */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-surface bg-mantle divide-y divide-surface">
        {words.length === 0 ? (
          <div className="p-6 text-center text-muted text-sm">
            {search ? 'No matches found.' : 'No words yet. Import a vocabulary file to get started.'}
          </div>
        ) : (
          words.map((w) => (
            <div key={w.id} className="flex items-baseline gap-3 px-3 py-2 hover:bg-surface/50">
              <span className="jp-text font-medium">{w.word}</span>
              {w.reading && (
                <span className="text-subtle text-sm">【{w.reading}】</span>
              )}
              {w.meaning && (
                <span className="text-muted text-sm truncate flex-1">— {w.meaning}</span>
              )}
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-muted">
        Supports: Anki .txt export (tab-separated) · CSV (word, reading, meaning) · plain word list
      </p>
    </div>
  )
}
