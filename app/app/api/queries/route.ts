import { db } from "@/db";
import { queries, listings, pipelineEvents } from "@/db/schema";
import {
  interpretPrompt,
  collectFromRemotive,
  collectFromSerp,
  filterByLocation,
  type RemoteJob,
  type SerpResult,
} from "@/lib/pipeline";
import { desc, eq } from "drizzle-orm";

type SerpResultLike = SerpResult;

type ValidatedRow = {
  title: string;
  company: string;
  location: string | null;
  category: string | null;
  jobType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  publicationDate: string;
  tags: string[];
  sourceUrl: string;
  sourceName: string;
  dedupeKey: string;
  incomplete: boolean;
};

export async function GET() {
  const rows = await db.select().from(queries).orderBy(desc(queries.id)).limit(100);
  const seen = new Set<string>();
  const unique = rows.filter((q) => {
    const key = q.prompt
      .toLowerCase()
      .replace(/[।.,!?؟]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // "mujhe Noida Mein flat dikhaao." and "मुझे Noida में flat दिखाओ" are the same ask;
    // collapse Hinglish romanisations and Devanagari into one key
    const normalized = key
      .replace(/में|मे|mein|me\b/g, "in")
      .replace(/दिखाओ|dikhaao|dikhao|दिखा|show/g, "show")
      .replace(/मुझे|mujhe|mujh/g, "i");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
  return Response.json({ queries: unique.slice(0, 20) });
}

export async function POST(request: Request) {
  let prompt: string | undefined;
  try {
    ({ prompt } = (await request.json()) as { prompt?: string });
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 500) {
    return Response.json({ error: "prompt must be 1-500 characters" }, { status: 400 });
  }
  prompt = prompt.trim();

  const [query] = await db.insert(queries).values({ prompt, status: "running" }).returning();
  const queryId = query.id;

  async function mark(stage: string, status: string, detail: string, t0: number) {
    await db.insert(pipelineEvents).values({
      queryId,
      stage,
      status,
      detail,
      durationMs: Date.now() - t0,
    });
  }

  try {
    // Stage 1: interpret
    let t0 = Date.now();
    await db.insert(pipelineEvents).values({ queryId, stage: "interpret", status: "running" });
    const interpreted = await interpretPrompt(prompt);
    await mark(
      "interpret",
      "ok",
      `${interpreted.topic} · ${interpreted.originalLanguage.toUpperCase()} · via ${interpreted.source}`,
      t0,
    );
    await db.update(queries).set({ interpreted }).where(eq(queries.id, queryId));

    // Stage 2: plan
    t0 = Date.now();
    await db.insert(pipelineEvents).values({ queryId, stage: "plan", status: "running" });
    const source =
      interpreted.vertical === "jobs" ? "Remotive API (permissioned)" : "SerpApi Google Search (permissioned)";
    await mark(
      "plan",
      "ok",
      `vertical: ${interpreted.vertical} · ${interpreted.keywords.length} keyword search(es): ${interpreted.keywords.join(", ")} · source: ${source}`,
      t0,
    );

    // Stage 3: collect
    t0 = Date.now();
    await db.insert(pipelineEvents).values({ queryId, stage: "collect", status: "running" });
    let raw: (RemoteJob | SerpResultLike)[] = [];
    if (interpreted.vertical === "jobs") {
      raw = await collectFromRemotive(interpreted.keywords);
    } else {
      raw = await collectFromSerp(interpreted.keywords, interpreted.location);
    }
    await mark(
      "collect",
      "ok",
      `${raw.length} listings collected from ${interpreted.vertical === "jobs" ? "remotive.com/api" : "serpapi.com (google_search)"}`,
      t0,
    );

    // Stage 4: validate + store
    t0 = Date.now();
    await db.insert(pipelineEvents).values({ queryId, stage: "validate", status: "running" });
    let offLocation = 0;
    let candidates: ValidatedRow[] = [];

    if (interpreted.vertical === "jobs") {
      const filtered = filterByLocation(raw as RemoteJob[], interpreted.location);
      offLocation = filtered.dropped;
      candidates = (filtered.kept as RemoteJob[]).map((j) => {
        const key = `${j.title.toLowerCase().trim()}|${j.company_name.toLowerCase().trim()}`;
        return {
          title: j.title,
          company: j.company_name,
          location: j.candidate_required_location || null,
          category: j.category || null,
          jobType: j.job_type || null,
          salaryMin: j.salary_min ? Number(j.salary_min) || null : null,
          salaryMax: j.salary_max ? Number(j.salary_max) || null : null,
          publicationDate: j.publication_date,
          tags: (Array.isArray(j.tags) ? j.tags.join(",") : (j.tags ?? ""))
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 8),
          sourceUrl: j.url,
          sourceName: "Remotive",
          dedupeKey: key,
          incomplete: !j.candidate_required_location || (!j.salary_min && !j.salary_max),
        };
      });
    } else {
      candidates = (raw as SerpResult[]).map((r) => ({
        title: r.title,
        company: r.sourceName,
        location: interpreted.location,
        category: interpreted.vertical,
        jobType: null,
        salaryMin: null,
        salaryMax: null,
        publicationDate: new Date().toISOString(),
        tags: r.price ? [r.price] : [],
        sourceUrl: r.url,
        sourceName: r.sourceName,
        dedupeKey: r.url,
        incomplete: false,
      }));
    }

    const seen = new Set<string>();
    const recencyDays = interpreted.recencyDays;
    const cutoff = recencyDays ? Date.now() - recencyDays * 86_400_000 : null;
    let stale = 0;
    const rows = candidates
      .filter((r) => {
        if (seen.has(r.dedupeKey)) return false;
        seen.add(r.dedupeKey);
        return true;
      })
      .filter((r) => {
        if (
          cutoff &&
          interpreted.vertical === "jobs" &&
          r.publicationDate &&
          new Date(r.publicationDate).getTime() < cutoff
        ) {
          stale += 1;
          return false;
        }
        return true;
      });

    const duplicates = candidates.length - rows.length - stale;
    const flagged = rows.filter((r) => r.incomplete).length;
    if (rows.length)
      await db.insert(listings).values(rows.map((r) => ({ ...r, queryId })));
    const kept = rows.length;
    await mark(
      "validate",
      "ok",
      [
        `${duplicates} duplicates removed`,
        offLocation ? `${offLocation} not in ${interpreted.location} removed` : null,
        stale ? `${stale} older than ${recencyDays} days removed` : null,
        `${flagged} rows flagged incomplete`,
        "every row carries a source URL",
      ]
        .filter(Boolean)
        .join(" · "),
      t0,
    );

    await db
      .update(queries)
      .set({ status: "done", collected: raw.length, kept, duplicates, flagged })
      .where(eq(queries.id, queryId));

    await db.insert(pipelineEvents).values({
      queryId,
      stage: "done",
      status: "ok",
      detail: `${kept} verified rows stored in Postgres`,
      durationMs: 0,
    });

    return Response.json({ id: queryId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "pipeline failed";
    await db.update(queries).set({ status: "error", error: message }).where(eq(queries.id, queryId));
    await db.insert(pipelineEvents).values({ queryId, stage: "done", status: "error", detail: message });
    return Response.json({ error: message, id: queryId }, { status: 502 });
  }
}
