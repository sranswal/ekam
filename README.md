<p align="center">
  <img src="docs/ekam-logo.png" alt="ekam" width="320" />
</p>

<h3 align="center">ask in plain words, get verified answers - all in one</h3>

<p align="center">
  <a href="#license"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg"></a>
  <a href="https://nextjs.org"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-black?logo=next.js"></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white"></a>
  <a href="https://orm.drizzle.team"><img alt="Drizzle" src="https://img.shields.io/badge/Drizzle-C5F74F?logo=drizzle&logoColor=black"></a>
  <a href="https://github.com/sranswal/ekam/pulls"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"></a>
</p>

**ekam** (Sanskrit: *one*) is a verified-opportunity finder. Ask in your own words - typed or
spoken, English or Hindi ("mujhe Noida mein flat dikhao", "AI developer jobs in Bengaluru") -
and get back verified, source-linked answers you can export.

One place to ask, verify and export: all in one.

## Features

- 🗣️ **Ask in plain language** - a single question bar interprets English and Hinglish queries
  and extracts topic, role, location and keywords. No forms, no filters, no boolean syntax.
- ✅ **Verify before you trust** - every result carries its source, so answers are checkable,
  not guessed.
- 🧭 **Built for four people** - at signup you pick a path (job seeker, student, SME / founder,
  agency) and the workspace adapts to it.
- 🌐 **Bilingual by design** - English and Hindi are first-class across the whole product.
- 🌗 **Light and dark** - theme switcher on the landing page, remembered across sessions.
- 📤 **Export** - clean, source-linked results as CSV or JSON.

## How it works

```mermaid
flowchart TD
    A[Landing page<br>EN / HI · light / dark · Get Started] --> B[Auth overlay<br>sign in / sign up]
    B --> C[Onboarding<br>pick your path: job seeker · student · SME · agency]
    C --> D[Workspace ask bar<br>text + voice, English or Hinglish]
    D --> E[Interpret<br>Gemini + deterministic fallback]
    E --> F[Fetch<br>live sources for the vertical]
    F --> G[Verify & rank<br>dedupe · source trust · freshness]
    G --> H[Verified results<br>every row shows its source]
    H --> I[Export CSV / JSON<br>+ unique query history]
```

1. **Landing page** - what ekam does, who it is for. Language (EN/HI), theme (light/dark) and a
   unified **Get Started** button that opens the sign-in / sign-up overlay.
2. **Onboarding** - one question: what will you use ekam for? Your answer shapes the workspace.
3. **Workspace** - ask, watch the pipeline (interpret, fetch, verify), get verified,
   source-linked results you can export.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL
- [Gemini](https://ai.google.dev) for query interpretation, with a deterministic regex fallback
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

| Variable       | Required | Description                  |
| -------------- | -------- | ---------------------------- |
| `DATABASE_URL` | yes      | PostgreSQL connection string |

## Project structure

```
app/
  app/            # App Router pages: landing, onboarding, workspace
  components/     # UI components (auth overlay, demo search, ...)
  lib/            # brand, pipeline, query interpretation
  db/             # Drizzle schema
  drizzle/        # migrations
  scripts/        # eval and utility scripts
  evals/          # evaluation sets for query interpretation
```

## Roadmap

- [x] Landing, auth overlay, onboarding, workspace
- [x] Multi-vertical pipeline with verified, source-linked results
- [x] English / Hindi, light / dark, CSV / JSON export, unique history
- [x] Voice input to the ask bar
- [ ] Conversational voice agent (Agora RTC)
- [ ] More verticals: government schemes, public services
- [ ] Saved searches and alerts
- [ ] Source-trust scores per publisher, regional languages beyond Hindi

See [PLAN.md](PLAN.md) for the full product plan - the problem, the personas and the build order.

## Contributing

Contributions are welcome! This is an early-stage project, so the easiest ways to help right now:

1. Fork the repo and create your branch from `main`.
2. Run `npm install && npm run dev` inside `app/` and make your change.
3. Run `npm run build` to make sure it type-checks and builds.
4. Open a pull request describing what changed and why.

## License

Released under the [MIT License](LICENSE).
