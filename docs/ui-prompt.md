UI prompt (paste into Speech / your design tool)

Redesign the web UI of "ekam", a verified-opportunity finder where people ask in plain words (typed or spoken, English or Hindi) and get verified, source-linked answers.

Brand:
- Name is always lowercase "ekam" (never "Ekam"). Tagline: "all in one" (Hindi: "सब एक जगह").
- Feel: calm, credible, modern Indian consumer product - not a hackathon demo, not a dashboard.
- Palette: warm off-white background (#faf9f6), deep ink text (#141414), one confident accent (saffron-amber #f59e0b or a deep teal #0d9488 - pick one and stick to it), plus a soft neutral gray scale. In dark mode: near-black (#0b0b10) surfaces with the same accent.
- Typography: one friendly geometric sans (Bricolage Grotesque or Plus Jakarta Sans) for everything; tight, generous letter spacing on headings. The lowercase wordmark is a visual anchor - use it large on the landing page.
- Voice: short, plain, human copy. Hinglish examples welcome ("mujhe Noida mein flat dikhao"). No corporate filler.

Layout and screens (Next.js app, desktop + mobile):
1. Landing page: sticky minimal header (wordmark left; EN/HI toggle, theme toggle, and one "Get Started" button right - no separate Login/Signup buttons). Hero = the ask bar front and center with a playful animated demo beneath it (query types itself, pipeline chips "interpret → fetch → verify" light up, mock verified results appear - it is a demo, no API). Below: "four kinds of people" section (job seeker, student, SME/founder, agency) as icon cards, then footer.
2. Auth overlay: sign in / sign up as a single centered modal dialog with tabs, over the landing page with a dimmed backdrop. Closes with the X button, clicking the backdrop, or Escape. Inline validation, warm microcopy.
3. Onboarding: one full-screen question - "what will you use ekam for?" - four large tappable cards with icons; selected state is clear; a single "continue" button.
4. Workspace: slim top bar (wordmark, history icon, profile), the ask bar big at the top with a mic button (voice input), and the pipeline visible as the answer builds: interpret → fetch → verify with subtle motion. Results are cards with title, one-line summary, source badge linking to the origin, and a freshness indicator. Export buttons (CSV, JSON) near the top of results. Empty state encourages the first question; loading state never lies about what is happening.
5. History / profile drawer: list of past unique queries, grouped by day; tap to re-run.

Interaction and quality bar:
- Motion is calm and purposeful: 150-250ms eases, staggered card entrances, the pipeline dots pulse while a stage runs. Respect prefers-reduced-motion (show finished states instead of animations).
- Fully responsive; the phone layout is the primary one (390px). Touch targets at least 44px. Keyboard accessible: visible focus rings, Escape closes overlays, tab order is logical.
- Empty, loading, error and success states designed for every screen - never a blank box.
- WCAG 2.2 AA contrast in both themes.
