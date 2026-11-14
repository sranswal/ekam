import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fallbackInterpret,
  detectLanguage,
  detectVertical,
  filterByLocation,
  geminiKeys,
  dedupeJobs,
  collectFromRemotive,
  MAX_RESULTS,
  type RemoteJob,
} from "./pipeline.ts";

test("fallbackInterpret extracts role and city from a Hinglish prompt", () => {
  const out = fallbackInterpret("mujhe Bengaluru mein backend engineer ki naukri chahiye");
  assert.equal(out.role, "backend");
  assert.equal(out.location, "Bengaluru");
  assert.equal(out.originalLanguage, "hinglish");
  assert.equal(out.source, "fallback");
  assert.ok(out.keywords.length > 0);
});

test("fallbackInterpret defaults to developer/Remote for an empty-ish prompt", () => {
  const out = fallbackInterpret("hello");
  assert.equal(out.role, "developer");
  assert.equal(out.location, "Remote");
});

test("detectVertical routes property asks away from jobs", () => {
  assert.equal(detectVertical("mujhe Maidaan में flat दिखाओ"), "properties");
  assert.equal(detectVertical("2bhk for rent in Noida"), "properties");
  assert.equal(detectVertical("AI developer jobs in Bengaluru"), "jobs");
  assert.equal(detectVertical("smart city tenders in Pune"), "tenders");
});

test("fallbackInterpret marks a flat ask as the properties vertical", () => {
  const out = fallbackInterpret("mujhe Noida में flat दिखाओ");
  assert.equal(out.vertical, "properties");
  assert.ok(out.keywords.some((k) => /flat/.test(k)));
});

test("filterByLocation drops global-remote rows when a city is asked", () => {
  const noida = { ...fakeJob(1), candidate_required_location: "Noida" };
  const remote = { ...fakeJob(2), candidate_required_location: "Remote" };
  const mumbai = { ...fakeJob(3), candidate_required_location: "Mumbai" };
  const out = filterByLocation([noida, remote, mumbai], "Noida");
  assert.deepEqual(out.kept.map((j) => j.id), [1]);
  assert.equal(out.dropped, 2);
  assert.equal(filterByLocation([remote], "Remote").dropped, 0);
});

test("filterByLocation treats NCR cities as Delhi NCR", () => {
  const gurgaon = { ...fakeJob(1), candidate_required_location: "Gurgaon" };
  const out = filterByLocation([gurgaon], "Delhi NCR");
  assert.equal(out.kept.length, 1);
  assert.equal(out.dropped, 0);
});

test("detectLanguage flags Devanagari as hi", () => {
  assert.equal(detectLanguage("मुझे नौकरी चाहिए"), "hi");
  assert.equal(detectLanguage("I need a job"), "en");
});

test("geminiKeys splits a comma-separated env value and skips blanks", () => {
  process.env.GEMINI_API_KEY = "key-one, ,key-two,";
  const keys = geminiKeys();
  assert.deepEqual(keys, ["key-one", "key-two"]);
  delete process.env.GEMINI_API_KEY;
  assert.deepEqual(geminiKeys(), []);
});

test("dedupeJobs keeps first occurrence and order", () => {
  const jobs = [{ id: 2 }, { id: 1 }, { id: 2 }, { id: 3 }];
  assert.deepEqual(
    dedupeJobs(jobs).map((j) => j.id),
    [2, 1, 3],
  );
});

function fakeJob(id: number, title = "Backend Engineer"): RemoteJob {
  return {
    id,
    url: `https://remotive.com/${id}`,
    title,
    company_name: "Acme",
    category: "software",
    job_type: "full_time",
    candidate_required_location: "Remote",
    salary_min: null,
    salary_max: null,
    publication_date: new Date().toISOString(),
    tags: ["node"],
  };
}

test("collectFromRemotive makes exactly one request capped at MAX_RESULTS", async () => {
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: unknown) => {
    calls.push(String(url));
    return new Response(JSON.stringify({ jobs: Array.from({ length: 40 }, (_, i) => fakeJob(i + 1)) }), {
      status: 200,
    });
  }) as typeof fetch;
  try {
    const jobs = await collectFromRemotive(["backend", "node", "python"]);
    assert.equal(calls.length, 1, "one search request per stage");
    assert.ok(calls[0].includes("limit=10"), "server-side cap of 10 results");
    assert.equal(jobs.length, MAX_RESULTS);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("collectFromRemotive returns [] with no keywords instead of fetching", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    assert.deepEqual(await collectFromRemotive([]), []);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("collectFromRemotive throws on non-2xx so the caller can degrade", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("nope", { status: 500 })) as typeof fetch;
  try {
    await assert.rejects(collectFromRemotive(["backend"]), /remotive 500/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
