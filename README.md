<p align="center">
  <img src="app/public/ekam_logo.png" alt="ekam" width="320" />
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

## Demo

Watch the 40-second product demo ([docs/demo.mp4](docs/demo.mp4) - also embedded right on the
landing page): a real query asked, searched, verified and exported, end to end.

<details>
<summary>What you'll see</summary>

1. Landing page → "Ask. Get answers."
2. A query typed into the workspace ask bar: *remote react developer jobs*
3. The pipeline runs - interpret, fetch, verify (the honest "Searching verified sources…" wait included)
4. The results dashboard: verified / duplicates / flagged stat cards, every row with its source
5. One-click CSV / JSON export

</details>

## Features

- 🗣️ **Ask in plain language** - a single question bar interprets English and Hinglish queries
  and extracts topic, role, location and keywords. No forms, no filters, no boolean syntax.
- ✅ **Verify before you trust** - every result carries its source, so answers are checkable,
  not guessed. The LLM only parses intent; the answers come from fetched source records, so
  ekam structurally can't invent a row.
- 🧭 **Built for four people** - at signup you pick a path (job seeker, student, SME / founder,
  agency) and the workspace adapts to it.
- 🌐 **Bilingual by design** - English and Hindi are first-class across the whole product.
- 🌗 **Light and dark** - theme switcher on the landing page, remembered across sessions.
- 📤 **Export** - clean, source-linked results as CSV or JSON.

## User journey

```mermaid
flowchart TD
    A[Landing page<br>EN / HI · light / dark · Get Started] --> B[Auth overlay<br>sign in / sign up]
    B --> C[Onboarding<br>pick your path: job seeker · student · SME · agency]
    C --> D[Workspace ask bar<br>text + voice, English or Hinglish]
    D --> E{{Verified results<br>every row shows its source}}
    E --> F[Export CSV / JSON<br>+ unique query history]
```

## How a query flows through ekam

```mermaid
flowchart LR
    Q[Ask bar<br>text or voice] --> I[Interpret<br>Gemini, with deterministic<br>regex fallback]
    I --> F[Fetch<br>live sources for the vertical]
    F --> V[Verify & rank<br>dedupe · source link · freshness]
    V --> R[(Results<br>source-linked rows)]
    R --> X[Export<br>CSV / JSON]
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

| Variable          | Required | Description                                                                                      |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`    | yes      | PostgreSQL connection string                                                                      |
| `GEMINI_API_KEY`  | no       | Google Gemini API key, used for intent interpretation. Without it, a deterministic regex fallback is used |
| `SERPAPI_API_KEY` | no       | SerpAPI key, used for some source fetches. Queries that need it return fewer rows without it        |

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

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for the short version: fork,
branch from `main`, make your change, run `npm run build`, open a pull request.

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Released under the [MIT License](LICENSE).

---

<p align="center"><em>Built with <a href="https://ml.ai">ML.ai</a> at InfraShift · hackathon by <a href="https://infrasity.com">Infrasity</a> and <a href="https://geekroom.tech">Geek Room</a></em></p>
