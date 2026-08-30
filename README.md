# StudyNest

A study-management workspace for students preparing for anything — JEE, NEET, UPSC, school, college, coding interviews or something else entirely.

StudyNest helps you:

- **Organize** subjects → chapters/topics with priorities, target dates and notes
- **Track** focused study sessions with a timestamp-accurate timer (pause/resume, survives tab sleep & refresh)
- **Manage** tasks with due dates, priorities and subject links
- **Set goals** (hours, chapters, sessions, streaks, tasks) measured from real activity
- **Review** honest analytics: weekly trends, a GitHub-style consistency heatmap, subject split, busiest days
- **Ask** the AI study assistant — study plans, next-topic ranking, active-recall quizzes, progress reviews
- **Stay consistent** with a streak system based on actual study days (≥ 1 minute), never inflated

## Tech stack

- **React 18 + TypeScript** (strict) on **Vite**
- **Tailwind CSS v4** design system (light/dark tokens, custom charts in pure SVG)
- **react-router-dom** (hash routing — deploys to any static host with zero rewrites)
- **date-fns**, **uuid**, **lucide-react**, **canvas-confetti**
- Persistence layer is centralized in `src/lib/storage.ts` with runtime validation; a Supabase schema with Row Level Security ships in `supabase/schema.sql` for cloud sync.

## Getting started

```bash
npm install
npm run dev        # local development
npm run build      # production build → dist/
npm run typecheck  # strict TypeScript check
```

## Data & persistence

By default StudyNest runs **local-first**: each account's workspace is stored in the browser under a versioned, per-user key (`sn.data.<userId>.v1`). All reads pass through validators — corrupted or missing fields never crash the app; they're defaulted safely.

Demo authentication (salted SHA-256) is included so the full flow — sign up → onboarding → protected app — works end-to-end with no backend. **For production, swap it for Supabase Auth.**

### Supabase setup (cloud sync)

1. Create a project at [supabase.com](https://supabase.com) and run `supabase/schema.sql` in the SQL editor. It creates `profiles`, `subjects`, `chapters`, `tasks`, `study_sessions`, `goals` and `assistant_messages` with **Row Level Security policies** so each user can only read/write their own rows.
2. Copy `.env.example` → `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Replace the adapter calls in `src/lib/storage.ts` / `src/store/store.ts` with `@supabase/supabase-js` queries (already in `package.json`) — entity shapes mirror the SQL tables 1:1.

Never use the `service_role` key in client code; it bypasses RLS.

### AI Assistant setup

The assistant calls any **OpenAI-compatible** `chat/completions` endpoint configured in **Settings → AI Assistant** (stored per-account, never hardcoded). When nothing is configured, a deterministic **offline study coach** answers from the user's real StudyNest data and the UI clearly says so.

> ⚠️ Putting an API key in the browser is demo-grade. For production, add a tiny serverless proxy (e.g. Vercel `api/ai/chat.ts`) that forwards to the provider with the key held server-side, and point the endpoint setting at that proxy.

## Environment variables

See [`.env.example`](./.env.example). No real secrets are committed.

## Project structure

```
src/
  components/   UI kit (ui), overlays (modal/toast/menu), charts, widgets, AppShell
  data/         prep-type presets, sample data generator
  lib/          storage (validated persistence), stats engine, utils
  pages/        Dashboard, Subjects, SubjectDetail, Tasks, Study, Goals,
                Analytics, Assistant, Settings, Auth, Onboarding
  services/     AI assistant (remote call + offline coach)
  store/        app store: auth, CRUD, timer, chat, selectors
  types.ts      all entity types
supabase/       schema.sql with RLS policies
```

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel (framework preset: **Vite**).
2. Add environment variables from `.env.example` if you connected Supabase/AI.
3. Build command `npm run build`, output directory `dist`. Done — hash routing means no rewrite rules needed.
