'use client'

import { useCallback, useEffect, useState } from 'react'
import { checkConnection, getDecks, addNotesBatch } from '@/lib/anki-connect'

interface Card {
  id: number
  target_word: string
  front: string
  back_furigana: string
  back_definition: string
  exported: boolean
  created_at: string
}

export default function CardsPanel() {
  const [cards, setCards] = useState<Card[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'exported'>('all')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [preview, setPreview] = useState<Card | null>(null)
  const [ankiConnected, setAnkiConnected] = useState<boolean | null>(null)
  const [decks, setDecks] = useState<string[]>(['Japanese'])
  const [deck, setDeck] = useState('Japanese')
  const [status, setStatus] = useState('')

  const fetchCards = useCallback(async () => {
    const res = await fetch(`/api/cards?filter=${filter}`)
    const data = await res.json()
    setCards(data.cards ?? [])
    setSelected(new Set())
  }, [filter])

  useEffect(() => { fetchCards() }, [fetchCards])

  useEffect(() => {
    checkConnection().then((ok) => {
      setAnkiConnected(ok)
      if (ok) getDecks().then(setDecks).catch(() => {})
    })
  }, [])

  function toggleCard(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll()  { setCards((c) => { setSelected(new Set(c.map((x) => x.id))); return c }) }
  function selectNone() { setSelected(new Set()) }

  async function deleteSelected() {
    if (!selected.size) return
    if (!confirm(`Delete ${selected.size} card(s)?`)) return
    await fetch('/api/cards', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected] }),
    })
    fetchCards()
  }

  async function exportAnki() {
    const toExport = selected.size
      ? cards.filter((c) => selected.has(c.id))
      : cards.filter((c) => !c.exported)

    if (!toExport.length) { setStatus('No cards to export.'); return }

    setStatus('Sending to Anki…')
    try {
      const noteIds = await addNotesBatch(deck, toExport.map((c) => ({
        front: c.front,
        back_furigana: c.back_furigana,
        back_definition: c.back_definition,
      })))
      const exported = noteIds.filter((id) => id !== null)
      const dupes = noteIds.length - exported.length
      const exportedCards = toExport.filter((_, i) => noteIds[i] !== null)

      await fetch('/api/cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: exportedCards.map((c) => c.id) }),
      })

      setStatus(
        `✓ Exported ${exported.length} cards to "${deck}"${dupes ? ` (${dupes} duplicates skipped)` : ''}`
      )
      fetchCards()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setStatus(`Anki error: ${msg}`)
    }
  }

  async function downloadCsv() {
    const f = selected.size ? 'all' : 'pending'
    const res = await fetch(`/api/cards/export?filter=${f}`)
    if (!res.ok) { setStatus('No cards to export.'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'flashcards.csv'; a.click()
    URL.revokeObjectURL(url)
    setStatus('CSV downloaded.')
  }

  const pending = cards.filter((c) => !c.exported).length

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-blue text-xs font-semibold tracking-widest uppercase">Generated Cards</span>
        <span className="ml-auto text-subtle text-sm">
          {cards.length} cards{pending > 0 ? ` · ${pending} pending` : ''}
        </span>
      </div>

      {/* Filter + Deck */}
      <div className="flex flex-wrap gap-2 items-center">
        {(['all', 'pending', 'exported'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1 rounded-full border transition-colors capitalize
              ${filter === f
                ? 'bg-blue text-crust border-blue font-semibold'
                : 'border-surface text-subtle hover:border-overlay'}`}
          >
            {f}
          </button>
        ))}
        <div className="flex-1" />
        <label className="text-subtle text-sm">Deck:</label>
        <select
          className="input py-1 text-sm w-40"
          value={deck}
          onChange={(e) => setDeck(e.target.value)}
        >
          {decks.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className={`text-xs font-semibold ${ankiConnected ? 'text-green' : 'text-red'}`}>
          Anki {ankiConnected === null ? '…' : ankiConnected ? '●' : '○'}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-surface bg-mantle min-h-0">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-crust text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="w-8 p-2 text-center">
                <input
                  type="checkbox"
                  onChange={(e) => e.target.checked ? selectAll() : selectNone()}
                  checked={selected.size === cards.length && cards.length > 0}
                  className="accent-blue"
                />
              </th>
              <th className="p-2 text-left w-20">Word</th>
              <th className="p-2 text-left">Front</th>
              <th className="p-2 text-left">Definition</th>
              <th className="p-2 w-16 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface">
            {cards.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted">
                  No cards yet. Use the Clipboard tab to generate some.
                </td>
              </tr>
            ) : (
              cards.map((card) => (
                <tr
                  key={card.id}
                  onClick={() => { toggleCard(card.id); setPreview(card) }}
                  className={`cursor-pointer transition-colors
                    ${selected.has(card.id) ? 'bg-blue/10' : 'hover:bg-surface/40'}
                    ${card.exported ? 'opacity-50' : ''}`}
                >
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(card.id)}
                      onChange={() => {}}
                      className="accent-blue pointer-events-none"
                    />
                  </td>
                  <td className="p-2 jp-text font-medium text-text">{card.target_word}</td>
                  <td className="p-2 jp-text text-subtle truncate max-w-xs">{card.front}</td>
                  <td className="p-2 text-muted truncate max-w-xs">
                    {card.back_definition.replace(/<[^>]+>/g, '').slice(0, 80)}
                  </td>
                  <td className="p-2 text-center">
                    {card.exported
                      ? <span className="text-green text-xs">✓</span>
                      : <span className="text-yellow text-xs">new</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Preview */}
      {preview && (
        <div className="rounded-lg border border-surface bg-mantle p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-blue text-xs font-semibold uppercase tracking-wider">Preview</span>
            <button onClick={() => setPreview(null)} className="text-muted hover:text-text text-xs">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted text-xs mb-1">Front</p>
              <p className="jp-text text-text">{preview.front}</p>
            </div>
            <div>
              <p className="text-muted text-xs mb-1">Back</p>
              <div
                className="card-html text-sm text-subtle leading-relaxed"
                dangerouslySetInnerHTML={{ __html: preview.back_furigana + '<br>' + preview.back_definition }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="border-t border-surface pt-3 flex flex-wrap gap-2 items-center">
        <button className="btn-ghost text-sm" onClick={selectAll}>Select All</button>
        <button className="btn-ghost text-sm" onClick={selectNone}>Deselect</button>
        <button className="btn-danger text-sm" onClick={deleteSelected} disabled={!selected.size}>
          Delete ({selected.size})
        </button>
        <div className="flex-1" />
        {status && <span className="text-xs text-subtle mr-2">{status}</span>}
        <button className="btn-secondary text-sm" onClick={downloadCsv}>
          Download CSV
        </button>
        <button
          className="btn-success text-sm"
          onClick={exportAnki}
          disabled={!ankiConnected}
          title={!ankiConnected ? 'Anki not running — open Anki with AnkiConnect add-on' : ''}
        >
          Export to Anki {selected.size > 0 ? `(${selected.size})` : '(pending)'}
        </button>
      </div>
    </div>
  )
}
