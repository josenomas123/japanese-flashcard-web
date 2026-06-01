# Japanese Flashcard Builder — Web

Versión web del sistema de Sentence Mining. Desplegada en Vercel con base de datos en Supabase.

## Deploy en 3 pasos

### 1. Supabase — crear la base de datos

1. Ve a [supabase.com](https://supabase.com) → **New Project**
2. En **SQL Editor → New Query**, pega y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql)
3. En **Project Settings → API** copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. GitHub — subir el código

```bash
cd C:\Users\josej\japanese-flashcard-web
git init
git add .
git commit -m "Initial commit"
# Crear repo en github.com, luego:
git remote add origin https://github.com/TU_USUARIO/japanese-flashcard-web.git
git push -u origin main
```

### 3. Vercel — deploy

1. Ve a [vercel.com](https://vercel.com) → **Add New Project** → importa tu repo de GitHub
2. En **Environment Variables** agrega todas las del archivo `.env.example`:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase |
| `AI_PROVIDER` | `anthropic` o `openai` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `AI_MODEL` | `claude-sonnet-4-6` |

3. Presiona **Deploy** — Vercel detecta Next.js automáticamente.

### Desarrollo local

```bash
cp .env.example .env.local
# Edita .env.local con tus keys
npm install
npm run dev
# → http://localhost:3000
```

## Arquitectura

```
Vercel (Next.js 14)
├── /app/page.tsx              ← SPA con 3 pestañas
├── /app/api/knowledge/        ← CRUD conocimiento
├── /app/api/generate/         ← Streaming IA (Claude/OpenAI)
└── /app/api/cards/            ← CRUD tarjetas + export CSV

Supabase (PostgreSQL)
├── knowledge                  ← Vocabulario conocido
└── generated_cards            ← Tarjetas generadas

Browser → localhost:8765       ← AnkiConnect directo (si Anki está abierto)
```

## Nota sobre AnkiConnect

Como Vercel es remoto pero Anki corre local, la integración AnkiConnect se hace directamente desde el navegador (fetch a `http://localhost:8765`). Esto funciona porque AnkiConnect permite CORS. Si Anki no está abierto, siempre puedes usar **Download CSV** para importar manualmente.
