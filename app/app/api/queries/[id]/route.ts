import { db } from "@/db";
import { queries, listings, pipelineEvents } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const queryId = Number(id);
  if (!Number.isInteger(queryId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  const [query] = await db.select().from(queries).where(eq(queries.id, queryId));
  if (!query) return Response.json({ error: "not found" }, { status: 404 });
  const events = await db
    .select()
    .from(pipelineEvents)
    .where(eq(pipelineEvents.queryId, queryId))
    .orderBy(asc(pipelineEvents.id));
  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.queryId, queryId))
    .orderBy(asc(listings.id));
  return Response.json({ query, events, listings: rows });
}
