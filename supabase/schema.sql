-- ── Japanese Flashcard Builder — Supabase Schema ─────────────────────────────
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- Known vocabulary (imported from Anki / CSV)
CREATE TABLE IF NOT EXISTS knowledge (
  id         BIGSERIAL PRIMARY KEY,
  word       TEXT      NOT NULL,
  reading    TEXT      NOT NULL DEFAULT '',
  meaning    TEXT      NOT NULL DEFAULT '',
  source     TEXT      NOT NULL DEFAULT '',
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT knowledge_word_unique UNIQUE (word)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_word ON knowledge (word);

-- AI-generated flashcards
CREATE TABLE IF NOT EXISTS generated_cards (
  id              BIGSERIAL PRIMARY KEY,
  target_word     TEXT        NOT NULL,
  front           TEXT        NOT NULL,
  back_furigana   TEXT        NOT NULL,
  back_definition TEXT        NOT NULL,
  exported        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cards_exported    ON generated_cards (exported);
CREATE INDEX IF NOT EXISTS idx_cards_target_word ON generated_cards (target_word);

-- Disable RLS (single-user personal tool)
ALTER TABLE knowledge       DISABLE ROW LEVEL SECURITY;
ALTER TABLE generated_cards DISABLE ROW LEVEL SECURITY;
