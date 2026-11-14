import { db } from "@/db";
import { listings } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const queryId = Number(id);
  if (!Number.isInteger(queryId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "csv";
  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.queryId, queryId))
    .orderBy(asc(listings.id));

  if (format === "json") {
    const data = rows.map((r) => ({
      title: r.title,
      company: r.company,
      location: r.location,
      category: r.category,
      job_type: r.jobType,
      salary_min: r.salaryMin,
      salary_max: r.salaryMax,
      published_at: r.publicationDate,
      tags: r.tags,
      source_url: r.sourceUrl,
    }));
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="ekam-query-${queryId}.json"`,
      },
    });
  }

  const header = [
    "title",
    "company",
    "location",
    "category",
    "job_type",
    "salary_min",
    "salary_max",
    "published_at",
    "tags",
    "source_url",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.title,
        r.company,
        r.location,
        r.category,
        r.jobType,
        r.salaryMin,
        r.salaryMax,
        r.publicationDate,
        r.tags.join("; "),
        r.sourceUrl,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ekam-query-${queryId}.csv"`,
    },
  });
}
