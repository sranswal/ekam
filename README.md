<p align="center">
  <img src="app/public/ekam_logo.png" alt="ekam" width="340" />
</p>

<h3 align="center">Ask in plain words, get verified answers — all in one.</h3>

<p align="center">
  <a href="#license"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-green.svg"></a>
  <a href="https://nextjs.org"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js"></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white"></a>
  <a href="https://orm.drizzle.team"><img alt="Drizzle" src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?logo=drizzle&logoColor=black"></a>
  <a href="https://ai.google.dev"><img alt="Google Gemini" src="https://img.shields.io/badge/Gemini-2.5_Flash-8E75B2?logo=google"></a>
  <a href="https://github.com/sranswal/ekam/pulls"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"></a>
</p>

<p align="center">
  <a href="#product-walkthrough">Product Demo</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#roadmap">Roadmap</a>
</p>

---

**ekam** (Sanskrit: *एकम्* — *the one*) is a verified-opportunity search engine and conversational agent for India. Ask questions in natural human language — typed or spoken, English, Hindi, or Hinglish (*"AI developer jobs in Bengaluru"*, *"मुझे Noida में 2BHK flat दिखाओ"*, *"Show IT supply tenders in Delhi"*) — and get back structured, deduplicated, source-linked results you can immediately verify and export.

No complex search filters. No hallucinations. **Every result links directly to its live verified source.**

---

## Product Walkthrough

<p align="center">
  <img src="docs/demo.gif" alt="ekam live product walkthrough" width="100%" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</p>

Watch the complete query lifecycle: ask in natural language → intent extraction → live source retrieval & deduplication → verified dashboard → one-click CSV / JSON export.

*(A full HD MP4 recording is also available at [`docs/demo.mp4`](docs/demo.mp4) and embedded on the web app.)*

---

## Key Features

- 🗣️ **Conversational Voice & Dictation** — Talk naturally with ekam via the continuous-turn voice dock or use voice dictation in profile forms. Supports English, Hindi, and Hinglish.
- 🎯 **Bilingual Intent Understanding** — Interprets colloquial and code-mixed prompts (extracts target role, vertical, location, recency, and keywords) via Google Gemini with instant deterministic regex fallback.
- 🛡️ **Zero Hallucination Guarantee** — LLMs only interpret the query. Results are fetched strictly from verified live APIs (Remotive, SerpApi, public registries). ekam structurally cannot fabricate a row.
- 🧭 **Tailored for 4 Personas** — Dedicated onboarding and workspace adaptations for **Job Seekers**, **Students & Interns**, **SMEs / Founders**, and **Recruitment Agencies**.
- ⚡ **Instant Verification & Dedupe** — Automatically eliminates duplicate listings across sources, filters incomplete postings, and flags suspicious entries.
- 📤 **Export Formats** — One-click export to clean CSV and JSON datasets.
- 🌓 **First-Class Theming & Accessibility** — System-aware dark and light modes, bilingual UI switching (EN / हिंदी), and responsive layouts.

---

## Architecture

ekam splits interpretation from execution to guarantee accuracy and eliminate hallucinations:

```mermaid
flowchart TD
    subgraph Input ["1. User Interaction"]
        UI_Text["⌨️ Ask Bar (Text)"]
        UI_Voice["🎙️ Conversational Voice Agent"]
        UI_Dict["🗣️ Voice Dictation"]
    end

    subgraph Intelligence ["2. Query Interpretation"]
        LLM["Gemini 2.5 Flash Engine"]
        Fallback["Deterministic Regex Fallback"]
        Intent["Parsed Intent<br/>Vertical · Role · City · Keywords · Language"]
    end

    subgraph Retrieval ["3. Live Verified Fetching"]
        Remotive["Remotive API<br/>(Jobs & Tech Roles)"]
        Serp["Google SERP API<br/>(Properties, Tenders, Events)"]
    end

    subgraph Processing ["4. Verification & Normalization Engine"]
        Dedupe["Deduplication Engine<br/>Hash & Similarity Match"]
        Verify["Source URL & Freshness Validation"]
        Schema["Structured Dataset Store<br/>(PostgreSQL via Drizzle ORM)"]
    end

    subgraph Output ["5. Verified Delivery"]
        Dashboard["Workspace Dashboard<br/>(Stat Cards & Verified Rows)"]
        Export["Export Engine<br/>(CSV & JSON Downloads)"]
        Speech["Spoken Spoken Results Feedback"]
    end

    Input --> LLM & Fallback
    LLM --> Intent
    Fallback --> Intent
    Intent --> Remotive & Serp
    Remotive & Serp --> Dedupe
    Dedupe --> Verify
    Verify --> Schema
    Schema --> Dashboard & Export & Speech
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, Turbopack, React 19) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) + Custom Design Tokens |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/) via [Drizzle ORM](https://orm.drizzle.team/) |
| **AI / Intent** | [Google Gemini API](https://ai.google.dev/) (`gemini-2.5-flash`) |
| **Speech & Audio** | Web Speech API (SpeechRecognition + SpeechSynthesis) |
| **Source Providers** | Remotive Verified API, Google Search SERP API |

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database

### 1. Clone & Install
```bash
git clone https://github.com/sranswal/ekam.git
cd ekam/app
npm install
```

### 2. Environment Variables
Create a `.env` file in the `app/` directory:

```env
DATABASE_URL=postgres://user:password@localhost:5432/ekam
GEMINI_API_KEY=your_gemini_api_key_here          # optional: fallback engine used if unset
SERPAPI_API_KEY=your_serpapi_key_here            # optional: used for properties and tenders
```

### 3. Database Schema Push
```bash
npx drizzle-kit push
```

### 4. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing

Run the automated test suites:

```bash
# Run pipeline and query interpretation tests
npm test

# Run conversational voice agent tests
npm run test:voice
```

---

## Roadmap

- [x] Search-first workspace with verified source links
- [x] Multi-persona onboarding and profile customizer
- [x] Conversational voice agent (bilingual continuous-turn audio loop)
- [x] Voice dictation across persona profiles
- [x] CSV and JSON dataset export
- [x] Full English and Hindi bilingual interface
- [ ] Source domain credibility and trust ratings
- [ ] Regional languages: Tamil, Telugu, Kannada, Bengali
- [ ] Saved search alerts and automated webhook triggers

---

## Contributing

Contributions, issues, and feature requests are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

By participating, you agree to adhere to the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

Distributed under the [MIT License](LICENSE).

<p align="center">
  <em>Built for InfraShift · Hackathon by <a href="https://infrasity.com">Infrasity</a> and <a href="https://geekroom.tech">Geek Room</a></em>
</p>
