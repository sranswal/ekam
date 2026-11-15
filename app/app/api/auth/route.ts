import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession, getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { PERSONAS } from "@/lib/brand";

type Body = { action?: string; email?: string; name?: string; password?: string; persona?: string };

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ user: null });
  return Response.json({
    user: { id: user.id, email: user.email, name: user.name, persona: user.persona, onboardedAt: user.onboardedAt },
  });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (body.action === "logout") {
    await destroySession();
    return Response.json({ ok: true });
  }

  if (body.action === "me") {
    const user = await getSessionUser();
    return Response.json({ user });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "enter a valid email" }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }

  if (body.action === "signup") {
    const name = body.name?.trim();
    if (!name) return Response.json({ error: "enter your name" }, { status: 400 });
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) {
      return Response.json({ error: "an account with this email already exists" }, { status: 409 });
    }
    const [user] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash: hashPassword(password),
        persona: body.persona && PERSONAS.some((p) => p.id === body.persona) ? body.persona : null,
      })
      .returning({ id: users.id, email: users.email, name: users.name, persona: users.persona, onboardedAt: users.onboardedAt });
    await createSession(user.id);
    return Response.json({ user });
  }

  // login
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return Response.json({ error: "wrong email or password" }, { status: 401 });
  }
  await createSession(user.id);
  return Response.json({
    user: { id: user.id, email: user.email, name: user.name, persona: user.persona, onboardedAt: user.onboardedAt },
  });
}
