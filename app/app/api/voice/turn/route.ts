import { getSessionUser } from "@/lib/auth";
import { agentTurn, type AgentContext, type VoiceTurn } from "@/lib/voice-agent";

const MAX_HISTORY_TURNS = 24;

function parseTurns(raw: unknown): VoiceTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: VoiceTurn[] = [];
  for (const item of raw.slice(-MAX_HISTORY_TURNS)) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as VoiceTurn).text === "string" &&
      ((item as VoiceTurn).role === "user" || (item as VoiceTurn).role === "agent")
    ) {
      const t = item as VoiceTurn;
      turns.push({
        role: t.role,
        text: t.text.slice(0, 600),
        lang: typeof t.lang === "string" ? t.lang.slice(0, 10) : null,
      });
    }
  }
  return turns;
}

type ResultsLike = AgentContext["pendingResults"];

function parseResults(raw: unknown): ResultsLike {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<NonNullable<ResultsLike>>;
  if (typeof r.prompt !== "string" || typeof r.kept !== "number") return null;
  const top = Array.isArray(r.top)
    ? r.top
        .filter(
          (row): row is NonNullable<ResultsLike>["top"][number] =>
            !!row && typeof row === "object" && typeof row.title === "string" && typeof row.company === "string",
        )
        .slice(0, 5)
        .map((row) => ({
          title: row.title.slice(0, 200),
          company: row.company.slice(0, 200),
          location: typeof row.location === "string" ? row.location.slice(0, 100) : null,
        }))
    : [];
  return {
    prompt: r.prompt.slice(0, 500),
    status: typeof r.status === "string" ? r.status.slice(0, 20) : "done",
    collected: typeof r.collected === "number" ? r.collected : 0,
    kept: r.kept,
    duplicates: typeof r.duplicates === "number" ? r.duplicates : 0,
    flagged: typeof r.flagged === "number" ? r.flagged : 0,
    error: typeof r.error === "string" ? r.error.slice(0, 300) : null,
    top,
  };
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });

  let body: {
    history?: unknown;
    userText?: unknown;
    pendingResults?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof body.userText !== "string" || !body.userText.trim() || body.userText.length > 500) {
    return Response.json({ error: "userText must be 1-500 characters" }, { status: 400 });
  }

  try {
    const reply = await agentTurn({
      history: parseTurns(body.history),
      userText: body.userText,
      userName: user.name,
      persona: user.persona,
      pendingResults: parseResults(body.pendingResults),
    });
    return Response.json(reply);
  } catch (err) {
    const message = err instanceof Error ? err.message : "agent turn failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
