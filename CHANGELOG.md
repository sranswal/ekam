# Changelog

All notable changes to ekam are documented in this file. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-11-15

### Added
- Demo video (`docs/demo.mp4`), embedded on the landing page and linked from the README.
- Always-on announcement banner: hackathon credit ("Built with ML.ai at InfraShift · hackathon by
  Infrasity and Geek Room") and a notice that all API keys in the hosted demo have been revoked.

### Changed
- Open-source cleanup: removed internal planning docs, pitch deck assets and agent files from the
  repository; added CONTRIBUTING, Code of Conduct and this changelog.

### Fixed
- `GET /api/auth` returns `{ user: null }` instead of a 401 for signed-out visitors.

## [0.1.0] - 2026-11-14

### Added
- Landing page with EN/HI language toggle and light/dark theme.
- Auth overlay (sign in / sign up) and persona onboarding: job seeker, student, SME, agency.
- Workspace ask bar with text and voice input, English and Hinglish.
- Query pipeline: intent interpretation (Gemini with deterministic regex fallback), live source
  fetching, dedupe and staleness filtering, source-linked verified results.
- CSV and JSON export; unique query history.
