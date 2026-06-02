'use client'

import { useState } from 'react'
import KnowledgePanel from '@/components/KnowledgePanel'
import ClipboardPanel from '@/components/ClipboardPanel'
import CardsPanel from '@/components/CardsPanel'
import BatchPanel from '@/components/BatchPanel'

type Tab = 'knowledge' | 'clipboard' | 'batch' | 'cards'

const TABS: { id: Tab; label: string }[] = [
  { id: 'knowledge', label: 'Knowledge Base' },
  { id: 'clipboard', label: 'Clipboard Input' },
  { id: 'batch', label: 'Auto Generate' },
  { id: 'cards', label: 'Generated Cards' },
]

export default function Home() {
  const [tab, setTab] = useState<Tab>('clipboard')
  const [wordCount, setWordCount] = useState(0)
  const [pendingCards, setPendingCards] = useState(0)

  async function refreshCounts() {
    const [kRes, cRes] = await Promise.all([
      fetch('/api/knowledge'),
      fetch('/api/cards?filter=pending'),
    ])
    const k = await kRes.json()
    const c = await cRes.json()
    setWordCount(k.count ?? 0)
    setPendingCards(c.cards?.length ?? 0)
  }

  function handleCardsGenerated() {
    refreshCounts()
    setTab('cards')
  }

  return (
    <div className="flex flex-col h-screen bg-base">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="h-11 flex items-center px-5 gap-3 bg-crust border-b border-surface shrink-0">
        <span className="text-text font-bold text-sm tracking-tight">
          🇯🇵 Japanese Flashcard Builder
        </span>
        <div className="flex-1" />
        <span className="text-subtle text-xs">
          {wordCount.toLocaleString()} known words
        </span>
        <span className="text-surface">|</span>
        <span className="text-subtle text-xs">
          {pendingCards} pending cards
        </span>
      </header>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <nav className="flex gap-px bg-mantle border-b border-surface shrink-0">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors relative
              ${tab === id
                ? 'text-text bg-base'
                : 'text-muted hover:text-subtle hover:bg-base/50'}`}
          >
            {label}
            {id === 'cards' && pendingCards > 0 && (
              <span className="ml-1.5 bg-blue text-crust text-xs rounded-full px-1.5 py-0.5 font-semibold">
                {pendingCards}
              </span>
            )}
            {tab === id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue" />
            )}
          </button>
        ))}
      </nav>

      {/* ── Panel content ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-5">
        {tab === 'knowledge' && (
          <KnowledgePanel onKnowledgeChange={refreshCounts} />
        )}
        {tab === 'clipboard' && (
          <ClipboardPanel onCardsGenerated={handleCardsGenerated} />
        )}
        {tab === 'batch' && (
          <BatchPanel onCardsGenerated={handleCardsGenerated} />
        )}
        {tab === 'cards' && <CardsPanel />}
      </main>
    </div>
  )
}
