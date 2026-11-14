import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const MAX_RESUME_CHARS = 20_000;

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });
  const rows = await db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1);
  return Response.json({ user, profile: rows[0] ?? null });
}

type Body = {
  headline?: string;
  skills?: string;
  preferredCity?: string;
  resumeText?: string;
  resumeFileName?: string;
};

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "not signed in" }, { status: 401 });
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const resumeText = (body.resumeText ?? "").slice(0, MAX_RESUME_CHARS);
  if (resumeText && resumeText.length < 40) {
    return Response.json({ error: "resume text looks too short to be a resume" }, { status: 400 });
  }
  const values = {
    headline: body.headline?.slice(0, 200) ?? null,
    skills: body.skills?.slice(0, 500) ?? null,
    preferredCity: body.preferredCity?.slice(0, 100) ?? null,
    resumeText: resumeText || null,
    resumeFileName: body.resumeFileName?.slice(0, 200) ?? null,
    updatedAt: new Date(),
  };
  const [profile] = await db
    .insert(profiles)
    .values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values })
    .returning();
  return Response.json({ profile });
}
