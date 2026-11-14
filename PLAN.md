# ekam — all in one

**Name:** ekam (from Sanskrit: "one"). One question, one verified answer, one place — all in one.
Repo: https://github.com/sranswal/ekam

## The problem

In India, finding anything official — a job, a flat, a tender, a scheme — means hopping across
dozens of sites full of duplicate, stale or fake listings. The information exists, but it is
scattered, untranslated and unverified. A student in Meerut and a founder in Coimbatore ask the
same question in different words and both end up with tabs of noise.

## What ekam is

ekam is a **verified-opportunity finder**. You ask in your own words — typed or spoken, English
or Hindi ("mujhe Noida mein flat dikhao", "AI developer jobs in Bengaluru") — and ekam:

1. **Understands** the intent, vertical and location (Gemini, with a deterministic fallback).
2. **Searches** the right live sources for that vertical — jobs, properties, tenders, events.
3. **Verifies and ranks** results: deduplication, source trust, freshness.
4. **Returns one clean, source-linked dataset** you can view, filter and export (CSV/JSON).

Everything runs through one pipeline: interpret → fetch → verify → store → serve. Every row
carries its source and timestamp, so "verified" is checkable, not a claim.

## Who it is for (from day one)

ekam was designed for five personas, chosen at signup so the interface adapts:

- **Job seekers** — verified roles matched to skills and city.
- **Students** — internships, first jobs, skill pathways.
- **SMEs / founders** — tenders, suppliers, properties, hiring.
- **Agencies** — bulk sourcing and clean datasets for clients.
- **Recruiters** — demand tracking across cities.

## Product principles

- **Ask anything, not just jobs.** The vertical is chosen by the question, not the app.
- **Local first.** Location in the question sets the search, not "Remote" defaults.
- **Vernacular is primary,** not a translation layer. English and Hindi are first-class.
- **Every answer shows its source.** No source, no row.
- **Unique history.** Asking the same thing twice shows one entry, not ten.

## The product flow (designed, not retrofitted)

1. **Landing page** — what ekam does, who it is for. Language (EN/HI), theme (light/dark),
   log in and create-account entry points are always visible.
2. **Account** — email + password, session cookie, redirect guard for private pages.
3. **Onboarding** — one question: what will you use ekam for? (job seeker, student, SME,
   agency, recruiter). This shapes the workspace, not just a label.
4. **Workspace** — the ask bar (text + voice), a live pipeline tracker
   (interpret → fetch → verify → store → serve), verified results with sources, unique recent
   queries, export.
5. **Profile** — resume/skill profile that sharpens matching over time.

## Architecture

- **Next.js (App Router)**, TypeScript, Tailwind v4, design tokens in `app/globals.css`.
- **Postgres + Drizzle**: users, sessions, queries, results, pipeline runs.
- **Gemini** (`gemini-flash-latest`) for interpretation; deterministic regex fallback so the
  product still works when the model doesn't.
- **API routes**: `/api/auth`, `/api/onboarding`, `/api/profile`, `/api/queries`.
- Deployed as a preview; GitHub: `sranswal/ekam`.

## Voice, as an interface

Voice is not a dictation toy — it is the primary interface for the next hundred million users.
Shipped: voice input to the ask bar. Next: a full conversational voice session (Agora RTC)
where ekam speaks results back and asks clarifying questions.

## Roadmap

- **Now (hackathon):** landing + auth + onboarding, multi-vertical pipeline, verified results,
  EN/HI, light/dark, exports, unique history.
- **Next:** conversational voice agent (Agora), more verticals (schemes, services), saved
  searches and alerts.
- **Later:** source-trust scores per publisher, regional languages beyond Hindi, API for
  agencies.

## Naming note

"ekam" is final (repo: sranswal/ekam). Light-mode brand reference lives at
`app/public/brand/ekam-light-reference.png`; brand assets to be extended as more arrive.
