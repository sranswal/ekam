# Contributing to ekam

Thanks for your interest in contributing! ekam is an early-stage project, so issues and pull
requests of all sizes are welcome - a typo fix, a new vertical, a better verification step.

## Getting set up

Prerequisites: Node 20+, a PostgreSQL database.

```bash
git clone https://github.com/sranswal/ekam.git
cd ekam/app
npm install
cp .env.example .env   # set DATABASE_URL; GEMINI_API_KEY and SERPAPI_API_KEY are optional
npx drizzle-kit push   # create the schema
npm run dev
```

Open http://localhost:3000 and try a query like "remote react developer jobs".

## Making a change

1. Fork the repo and create your branch from `main`.
2. Make your change. Keep the scope of a pull request to one thing.
3. Check your work before opening the PR:

```bash
npx tsc --noEmit   # type check
npm test           # unit tests
npm run build      # production build
```

4. Open a pull request describing what changed and why.

## Ground rules

- Every answer row must be **source-linked**. Never render model-generated content as a result.
- The app must work without `GEMINI_API_KEY` and `SERPAPI_API_KEY` (the fallbacks are the point).
- English and Hindi strings ship together - if you add UI text, add both.
- Run `npm run build` before pushing.

## Reporting bugs

Open an [issue](https://github.com/sranswal/ekam/issues) with what you asked, what you expected,
what you got, and your console output. Feature ideas are welcome too - explain the user problem
first.
