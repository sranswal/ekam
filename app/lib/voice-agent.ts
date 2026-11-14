// Brain of the ekam conversational voice agent.
// Single entry point `agentTurn()`; the API route and UI never talk to Gemini
// directly, so the brain can be swapped (see docs/adr/0001) without touching them.

import { detectLanguage } from "./pipeline";

export type VoiceRole = "user" | "agent";
export type VoiceTurn = { role: VoiceRole; text: string; lang: string | null };

export type VoiceResults = {
  prompt: string;
  status: string;
  collected: number;
  kept: number;
  duplicates: number;
  flagged: number;
  error: string | null;
  top: Array<{ title: string; company: string; location: string | null }>;
};

export type VoiceAction = { type: "run_query"; prompt: string };

export type AgentReply = {
  reply: string;
  replyHindi: string | null;
  action: VoiceAction | null;
  source: "gemini" | "fallback";
};

export type AgentContext = {
  history: VoiceTurn[]; // prior turns, oldest first (already excluding this turn's user text)
  userText: string;
  userName?: string | null;
  persona?: string | null;
  /** Present when the pipeline just finished running for this user's request. */
  pendingResults?: VoiceResults | null;
};

const MAX_HISTORY = 12; // agent turns kept in context (6 user + 6 agent)

export function trimHistory(history: VoiceTurn[]): VoiceTurn[] {
  return history
    .filter((t) => t && typeof t.text === "string" && t.text.trim())
    .slice(-MAX_HISTORY);
}

const SEARCH_SIGNALS: RegExp =
  /\b(job|jobs|naukri|naukari|vacancy|hiring|internship|intern|role|roles|flat|flats|apartment|ghar|makaan|plot|rent|kiraya|pg|bhk|property|real.?estate|tender|tenders|nivida|rfp|event|events|concert|mela|workshop|meetup|venue|supplier|vendor)\b|दिखाओ|बताओ|चाहिए|dikhao|dikhaao|batao|chahiye|milengi|milegi/i;

const GREETING_RE = /\b(hi|hello|hey|namaste|namaskar|नमस्ते|नमस्कार|kaise ho|kya haal)\b/i;
const THANKS_RE = /\b(thanks|thank you|shukriya|dhanyavaad|dhanyavad|शुक्रिया|धन्यवाद)\b/i;
const WHO_RE = /\b(who are you|tum kaun|aap kaun|tumhara naam|aapka naam|what can you do|kya kar sakte)\b/i;
const STOP_RE = /\b(stop|bas|ruko|rukiye|chup|band karo|khatam|bye|alvida)\b/i;

function isSearchAsk(text: string): boolean {
  return SEARCH_SIGNALS.test(text);
}

function cannedEn(text: string, name: string | null | undefined): { reply: string; replyHindi: string | null } | null {
  if (STOP_RE.test(text)) {
    return { reply: "Theek hai, main yahin hoon jab aap ready hon.", replyHindi: "ठीक है, मैं यहीं हूँ जब आप तैयार हों।" };
  }
  if (THANKS_RE.test(text)) {
    return { reply: "Anytime! Anything else you want me to find?", replyHindi: "कभी भी! और कुछ ढूंढना है?" };
  }
  if (WHO_RE.test(text)) {
    return {
      reply: `I'm ekam — you ask in plain words, I search verified sources and give you every row with its source. Jobs, properties, tenders or events. Just tell me what you're looking for${name ? `, ${name}` : ""}.`,
      replyHindi: "मैं ekam हूँ — आप साधारण शब्दों में पूछें, मैं सत्यापित स्रोतों से हर पंक्ति उसके स्रोत के साथ देता हूँ। नौकरियां, प्रॉपर्टी, टेंडर या इवेंट्स। बस बताइए क्या चाहिए।",
    };
  }
  if (GREETING_RE.test(text)) {
    return {
      reply: `Namaste${name ? ` ${name}` : ""}! What are we finding today — jobs, a flat, tenders, events?`,
      replyHindi: `नमस्ते${name ? ` ${name}` : ""}! आज क्या ढूंढना है — नौकरी, फ्लैट, टेंडर, इवेंट?`,
    };
  }
  return null;
}

/** Spoken summary of a finished pipeline run, phrased like a person talking. */
export function fallbackResultsSummary(r: VoiceResults): { reply: string; replyHindi: string | null } {
  if (r.status !== "done" || r.kept === 0) {
    return {
      reply: `Sorry, I couldn't find verified rows for ${r.prompt}. Want me to try different words — maybe a different city or role?`,
      replyHindi: `माफ़ कीजिए, ${r.prompt} के लिए सत्यापित पंक्तियां नहीं मिलीं। दूसरे शब्दों में आज़माएं — कोई और शहर या रोल?`,
    };
  }
  const topBits = r.top
    .slice(0, 3)
    .map((row) => `${row.title} at ${row.company}${row.location ? ` in ${row.location}` : ""}`);
  const more = r.kept > 3 ? ` That's 3 of ${r.kept}` : "";
  const dup = r.duplicates > 0 ? ` I removed ${r.duplicates} duplicate${r.duplicates > 1 ? "s" : ""}.` : "";
  return {
    reply: `I found ${r.kept} verified row${r.kept > 1 ? "s" : ""} for ${r.prompt}.${dup} Top: ${topBits.join("; ")}.${more} You can open the workspace to see every row with its source.`,
    replyHindi: `${r.prompt} के लिए मुझे ${r.kept} सत्यापित पंक्तियां मिलीं। शीर्ष: ${topBits.join("; ")}। ${r.kept > 3 ? `यह 3 में से ${r.kept} हैं।` : ""} हर पंक्ति का स्रोत वर्कस्पेस में देखिए।`,
  };
}

function geminiKeys(): string[] {
  return (process.env.GEMINI_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

type GeminiTurn = { role: VoiceRole; text: string };

function buildPrompt(ctx: AgentContext): string {
  const transcript: GeminiTurn[] = [...trimHistory(ctx.history), { role: "user", text: ctx.userText }];
  const lines = transcript
    .map((t) => `${t.role === "user" ? "USER" : "AGENT"}: ${t.text}`)
    .join("\n");
  const results = ctx.pendingResults
    ? `\nPIPELINE_RESULT (already ran, do not search again): ${JSON.stringify(ctx.pendingResults)}`
    : "";
  return [
    "You are ekam, a warm, quick-witted voice assistant for people in India (jobseekers, students, small businesses, agencies).",
    "You talk out loud - short spoken sentences, 1-3 sentences max, no markdown, no emoji, no lists.",
    "The user speaks English, Hindi or Hinglish; ALWAYS answer in the same language mix they used.",
    ctx.userName ? `The user's name is ${ctx.userName}; use it once when it feels natural.` : "",
    ctx.persona ? `The user's profile is: ${ctx.persona}.` : "",
    "You have one tool: the ekam pipeline, which finds verified rows (jobs, properties, tenders, events) and returns each row with its source.",
    'Reply with ONLY a JSON object: {"reply": "<what you say now>", "replyHindi": "<Hindi (Devanagari) version of the same reply, or null if the reply is already Hindi>", "search": true|false, "query": "<short search query string for the pipeline, or null>"}.',
    'Set "search": true ONLY when the user is asking to find/see real rows right now (a job, flat, tender, event...). When "search": true, put the cleaned-up search request into "query" (e.g. "AI developer jobs in Bengaluru") and put a short spoken confirmation into "reply" (e.g. "One moment, searching for AI developer jobs in Bengaluru.").',
    "If PIPELINE_RESULT is given, speak its result like a person: how many verified rows, the top 2-3 by title/company/location, and mention duplicates removed if any. Never invent rows that are not in PIPELINE_RESULT.",
    "Do not repeat your earlier sentences. Be natural, like a person on a phone call.",
    "",
    "CONVERSATION SO FAR:",
    lines,
    results,
  ]
    .filter(Boolean)
    .join("\n");
}

async function callGemini(model: string, key: string, prompt: string): Promise<AgentReply> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 2000,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as {
    reply?: string;
    replyHindi?: string | null;
    search?: boolean;
    query?: string | null;
  };
  if (!parsed.reply || typeof parsed.reply !== "string") throw new Error("empty reply");
  const actionPrompt = (parsed.query && typeof parsed.query === "string" && parsed.query.trim())
    ? parsed.query.trim().slice(0, 500)
    : "";
  return {
    reply: parsed.reply.slice(0, 600),
    replyHindi: parsed.replyHindi && typeof parsed.replyHindi === "string" ? parsed.replyHindi.slice(0, 600) : null,
    action: parsed.search === true ? { type: "run_query", prompt: actionPrompt } : null,
    source: "gemini",
  };
}

/** Deterministic reply used when no Gemini key is configured or Gemini fails. */
export function fallbackTurn(ctx: AgentContext): AgentReply {
  const lang = detectLanguage(ctx.userText);
  const isHinglish = lang === "hinglish";

  if (ctx.pendingResults) {
    const { reply, replyHindi } = fallbackResultsSummary(ctx.pendingResults);
    return { reply, replyHindi, action: null, source: "fallback" };
  }

  const canned = cannedEn(ctx.userText, ctx.userName);
  if (canned && !isSearchAsk(ctx.userText)) {
    return {
      reply: canned.reply,
      replyHindi: lang === "hi" || isHinglish ? canned.replyHindi : null,
      action: null,
      source: "fallback",
    };
  }

  if (isSearchAsk(ctx.userText)) {
    const ack = `Ek minute, main dhoond raha hoon: ${ctx.userText.slice(0, 120)}`;
    const ackEn = `One moment, let me find that: ${ctx.userText.slice(0, 120)}`;
    return {
      reply: isHinglish || lang === "hi" ? ack : ackEn,
      replyHindi: null,
      action: { type: "run_query", prompt: ctx.userText.slice(0, 500) },
      source: "fallback",
    };
  }

  return {
    reply: "Main ekam hoon - mujhse jobs, flat, tender ya event poochhiye, main verified sources se dhoond kar bataunga.",
    replyHindi: "मैं ekam हूँ - मुझसे नौकरी, फ्लैट, टेंडर या इवेंट पूछिए, मैं सत्यापित स्रोतों से ढूंढकर बताऊंगा।",
    action: null,
    source: "fallback",
  };
}

export async function agentTurn(ctx: AgentContext): Promise<AgentReply> {
  const userText = ctx.userText.trim().slice(0, 500);
  if (!userText) throw new Error("userText must be 1-500 characters");
  const safeCtx: AgentContext = { ...ctx, userText, history: trimHistory(ctx.history) };
  for (const key of geminiKeys()) {
    for (const model of ["gemini-3.5-flash", "gemini-3-flash-preview", "gemini-flash-latest"]) {
      try {
        const reply = await callGemini(model, key, buildPrompt(safeCtx));
        // The request to run is the user's own utterance (the pipeline
        // re-interprets it), not the agent's phrasing of it.
        if (reply.action) reply.action.prompt = userText;
        return reply;
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(JSON.stringify({ event: "voice_agent_gemini_failed", model, error: String(err) }));
        }
      }
    }
  }
  return fallbackTurn(safeCtx);
}
