import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PERSONAS, type PersonaId } from "@/lib/brand";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "not signed in" }, { status: 401 });
  const [user] = await db
    .select({ id: users.id, persona: users.persona, onboardedAt: users.onboardedAt })
    .from(users)
    .where(eq(users.id, session.id))
    .limit(1);
  return Response.json({ persona: user?.persona ?? null, onboardedAt: user?.onboardedAt ?? null });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "not signed in" }, { status: 401 });

  let body: { persona?: string };
  try {
    body = (await request.json()) as { persona?: string };
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const persona = body.persona;
  if (!persona || !PERSONAS.some((p) => p.id === persona)) {
    return Response.json({ error: "choose one of: " + PERSONAS.map((p) => p.id).join(", ") }, { status: 400 });
  }

  const onboardedAt = new Date();
  await db.update(users).set({ persona: persona as PersonaId, onboardedAt }).where(eq(users.id, session.id));
  return Response.json({ ok: true, persona, onboardedAt });
}
