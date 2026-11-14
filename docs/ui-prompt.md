# ekam - UI inventory for the designer

This file only describes what ekam is and what UI currently exists (screens, pages, buttons, controls). Design decisions are entirely up to you.

## What ekam is

ekam is a verified-opportunity finder. A person types (or speaks) a question in plain English, Hindi or Hinglish - "AI developer jobs in Bengaluru", "mujhe Noida mein flat dikhao" - and the app runs it through a visible pipeline (interpret, plan, collect, validate), then returns result rows that each link to their original source. Rows with missing fields are flagged "incomplete" rather than hidden. Every query is stored, so users can re-run past questions. The whole product is bilingual (English / Hindi) with a language toggle, and has light and dark themes.

## Screens and pages (Next.js app, desktop + mobile, phone is primary)

### Landing page (/)

- Sticky header: logo/wordmark on the left; on the right an EN/हिंदी language switch (pill toggle), a theme toggle (sun/moon icon button), and either a "Get Started" button (logged out) or a "Go to workspace" link (logged in).
- Hero: the ask bar front and centre, plus a self-playing demo - a sample query types itself, pipeline stage chips light up in order, and mock verified results appear. It is a demo with no API behind it.
- Persona section: four cards (job seeker, student, SME/founder, agency) with icons and short descriptions.
- "Why verified" section: four rows - source-linked, fresh by default, duplicates removed, flagged not hidden.
- CTA band: heading plus a Get Started / Go to workspace button.
- Footer: copyright line and a GitHub link.
- Auth overlay opens over this page (see below), including via deep links ?auth=open and ?auth=signup.

### Auth overlay (modal over landing)

- Single centered modal with tabs: sign in / sign up.
- Fields: name (sign up only), email, password. Inline validation messages.
- Closes via an X button, clicking the dimmed backdrop, or Escape.

### Login route (/login)

- Minimal redirect page that forwards to the landing page with the auth overlay open.

### Onboarding (/onboarding)

- One full-screen question: "what will you use ekam for?".
- Four large tappable persona cards (same four personas) with icons and a clear selected state.
- A single "continue" button; requires a choice.

### Workspace (/workspace) - the main app screen

- Slim top bar: wordmark, signed-in user identity, sign-out.
- The ask bar: large text input with a mic button (browser voice input; shows a graceful message when unsupported), an example-chips row (examples differ by persona), and a submit button.
- Pipeline status area: as a query runs, stage events (interpret, plan, collect, validate) stream in live with statuses and durations; errors are shown per stage.
- Interpretation panel: what the system understood - topic, role, location, keywords, detected language, translation if the input was Hindi/Hinglish, recency window.
- Filters row: free-text search over results, city filter, max-age (days) filter, "only complete" toggle.
- Stats band: collected / kept / duplicates / flagged counts.
- Results list: cards with title, company, location, tag chips, an "incomplete" badge where relevant, and a "source" link opening the original page in a new tab.
- Export: CSV and JSON download buttons for the current query.
- History section: list of past queries with their prompt, language badge and outcome ("✓ N rows" or "✗ error"); tapping one re-loads its full result.
- Empty, loading and error states exist for each of these.
- Footer line: "ekam · prompt → dataset → dashboard → CSV · data via permissioned public API".

### Profile (/profile)

- Account page: name, email, persona; lets the user update name and persona, and re-run onboarding.

## Element inventory

- Buttons: primary pill buttons (Get Started, continue, submit), icon buttons (theme, mic, X), tab switches (auth, EN/हिंदी), filter toggles, export buttons, history row buttons, sign-out.
- Inputs: text ask bar, email/password/name fields, filter fields (search, city, max age).
- Cards: persona cards, result cards, example chips.
- Lists: pipeline event feed, results list, history list.
- Badges/chips: tags, "incomplete", language badge, pipeline stage chips.
- States to design: empty, loading (streaming pipeline), per-stage error, global error, success, disabled.
