# ekam — all in one

**ekam** (Sanskrit: *one*) is a verified-opportunity finder. Ask in your own words — typed or
spoken, English or Hindi ("mujhe Noida mein flat dikhao", "AI developer jobs in Bengaluru") —
and get back verified, source-linked answers you can export.

One place to ask, verify and export: all in one.

## What it does

- **Ask in plain language.** A single question bar interprets English and Hinglish queries and
  extracts topic, role, location and keywords — no forms, no filters, no boolean syntax.
- **Verify before you trust.** Every result carries its source, so answers are verifiable rather
  than guessed.
- **Built for four people.** At signup you pick a path — job seeker, student, SME / founder, or
  agency — and the workspace adapts to it.
- **Bilingual by design.** English and Hindi across the landing page, onboarding and workspace.
- **Light and dark.** Theme switcher on the landing page, remembered across sessions.

## How it works

1. **Landing page** — what ekam does, who it is for. Language (EN/HI), theme (light/dark) and a
   unified **Get Started** button that opens the sign-in / sign-up overlay.
2. **Onboarding** — one question: what will you use ekam for? Your answer shapes the workspace.
3. **Workspace** — ask, watch the pipeline (interpret → fetch → verify), get verified,
   source-linked results you can export.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL
- Language and theme toggling built in (no i18n framework dependency)

## Getting started

Prerequisites: Node 20+, a PostgreSQL database.

```bash
git clone https://github.com/sranswal/ekam.git
cd ekam/app
npm install
cp .env.example .env   # or create .env with DATABASE_URL=postgres://user:pass@localhost:5432/app
npx drizzle-kit push   # create the schema
npm run dev
```

Open http://localhost:3000. Production:

```bash
npm run build
npm start
```

## Configuration

| Variable       | Required | Description                          |
| -------------- | -------- | ------------------------------------ |
| `DATABASE_URL` | yes      | PostgreSQL connection string         |

## Project structure

```
app/
  app/            # App Router pages: landing, onboarding, workspace
  components/     # UI components (auth overlay, demo search, …)
  lib/            # brand, pipeline, query interpretation
  db/             # Drizzle schema
  drizzle/        # migrations
  scripts/        # eval and utility scripts
  evals/          # evaluation sets for query interpretation
```

## Roadmap

See [PLAN.md](PLAN.md) for the product plan — the problem, the personas and the build order.

## Licence

© 2026 sranswal. All rights reserved.
