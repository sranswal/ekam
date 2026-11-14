# ADR 0001: Conversational voice agent for ekam

Date: 2026-11-14
Status: Accepted

## Context

ekam's plan (PLAN.md, "Next" phase) calls for a conversational voice agent: the user
should be able to **talk** to ekam — ask a question by voice, have the pipeline run,
and hear a spoken, verified answer — with the agent feeling like it is actually
conversing (continuous turns, natural acks, follow-ups like "sirf remote wali batao",
bilingual English/Hindi/Hinglish).

Constraints:

- Hackathon timeline; the text pipeline (interpret → plan → collect → validate) is done
  and battle-tested (`app/app/api/queries/route.ts`).
- Vault already holds `GEMINI_API_KEY` (used by `interpretPrompt`) and
  `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` (unused so far).
- Deploy target is Vercel serverless — no persistent bot process, no WebSockets.
- Users are on Android/desktop Chrome mostly; Hindi/Hinglish speakers are the core
  audience.

> Note: the request referenced a "kin architecture" document; no such document exists
> in the repo or workspace memory (checked 2026-11-14). This ADR records the
> architecture actually built; it can be superseded once the kin doc surfaces.

## Options

### A. Browser Web Speech + Gemini turn endpoint (chosen)

SpeechRecognition (Chrome/Edge built-in) for STT, a serverless
`POST /api/voice/turn` endpoint that sends the bounded conversation history to Gemini
Flash and returns a spoken-style reply plus an optional `run_query` action, and
SpeechSynthesis for TTS. The client runs a continuous loop: listen → think →
(optionally run the existing pipeline) → speak → listen again, with tap-to-interrupt
barge-in.

- Pros: zero new dependencies, ships on the current stack, works within the free
  Gemini tier, server stays stateless (no schema change — queries still flow through
  the existing pipeline and history), latencies are acceptable (~1–2 s turn + pipeline).
- Cons: Web Speech is Chromium-only; TTS voice quality is device-dependent; recognition
  cannot run while TTS is speaking without echo, so barge-in is tap-based, not purely
  voice-based.

### B. Agora RTC channel + server-side ASR/LLM/TTS pipeline

Agora voice channel between user and a server-side bot: audio streamed over RTC,
server does ASR (e.g. AssemblyAI/Sarvam), Gemini for the brain, a TTS engine for
speech, and Agora's token server (`AGORA_APP_CERTIFICATE`) for auth.

- Pros: real real-time conversation, true voice barge-in via echo cancellation,
  platform-independent audio path.
- Cons: needs a long-running media/bot service (doesn't fit Vercel serverless), at
  least two new paid vendors, and an RTC bot client implementation — days of work and
  new cost for a hackathon.

### C. Agora Conversational AI (managed agent)

Agora's ConvoAI product hosts the voice bot.

- Pros: best latency, barge-in out of the box.
- Cons: vendor lock-in on a newer product, per-minute cost, and the ekam "brain"
  (pipeline tool-calls, verified-rows summaries) must be exposed through their agent
  API — least control for the demo.

## Decision

Option A now, structured so the brain is swappable: **all conversation logic lives in
`app/lib/voice-agent.ts`** behind a single `agentTurn()` function; the endpoint and UI
never talk to Gemini directly. Upgrading to Option B/C later means replacing the STT/TTS
transport and keeping `agentTurn()` (which already speaks "actions", i.e. tool calls —
the same shape Agora's agent loop needs).

Conversation state is client-held (last 12 turns sent per request); the server stays
stateless. Every actual data run still goes through the existing
`POST /api/queries` pipeline, so voice sessions get verification, dedupe, history and
export for free, and no new tables were needed.

## Consequences / risks

- Browser support: VoiceSession shows a clear fallback message on non-Chromium
  browsers; typed flow remains fully functional.
- Echo barge-in limitation documented above; revisit in Option B.
- Gemini failure is non-fatal: `agentTurn()` falls back to deterministic bilingual
  replies and local result summaries, so the conversation never dead-ends.
