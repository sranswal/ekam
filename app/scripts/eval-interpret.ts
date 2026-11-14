/**
 * Eval set for the interpret stage of the pipeline (lib/pipeline.ts).
 *
 *   node scripts/eval-interpret.ts            # fallback interpreter (deterministic)
 *   GEMINI_API_KEY=... node scripts/eval-interpret.ts   # also scores the real model
 *
 * Writes evals/report.json and prints a per-case table.
 * Ground truth is hand-written: what a human would say the user asked for.
 */

import { interpretPrompt, fallbackInterpret } from "../lib/pipeline.ts";

type Expected = {
  role: string;
  location: string;
  originalLanguage: string;
};

type Case = { id: string; prompt: string; expected: Expected };

const GOLDEN: Case[] = [
  // English
  { id: "en-01", prompt: "AI developer jobs in Bengaluru", expected: { role: "ai", location: "Bengaluru", originalLanguage: "en" } },
  { id: "en-02", prompt: "frontend react jobs in Mumbai", expected: { role: "frontend", location: "Mumbai", originalLanguage: "en" } },
  { id: "en-03", prompt: "backend node developer roles in Delhi NCR", expected: { role: "backend", location: "Delhi NCR", originalLanguage: "en" } },
  { id: "en-04", prompt: "data scientist positions in Pune", expected: { role: "data", location: "Pune", originalLanguage: "en" } },
  { id: "en-05", prompt: "software engineering internships", expected: { role: "developer", location: "Remote", originalLanguage: "en" } },
  { id: "en-06", prompt: "machine learning engineer jobs in Hyderabad", expected: { role: "ai", location: "Hyderabad", originalLanguage: "en" } },
  { id: "en-07", prompt: "data analyst jobs in Chennai", expected: { role: "data", location: "Chennai", originalLanguage: "en" } },
  { id: "en-08", prompt: "python developer jobs in bangalore", expected: { role: "backend", location: "Bengaluru", originalLanguage: "en" } },
  { id: "en-09", prompt: "react developer jobs", expected: { role: "frontend", location: "Remote", originalLanguage: "en" } },
  { id: "en-10", prompt: "work from home developer jobs", expected: { role: "developer", location: "Remote", originalLanguage: "en" } },
  // Hindi (Devanagari)
  { id: "hi-01", prompt: "बेंगलुरु में डेवलपर की नौकरी चाहिए", expected: { role: "developer", location: "Bengaluru", originalLanguage: "hi" } },
  { id: "hi-02", prompt: "मुंबई में फ्रंटएंड जॉब बताओ", expected: { role: "frontend", location: "Mumbai", originalLanguage: "hi" } },
  { id: "hi-03", prompt: "दिल्ली में डेटा एनालिस्ट की वैकेंसी", expected: { role: "data", location: "Delhi NCR", originalLanguage: "hi" } },
  // Hinglish
  { id: "hg-01", prompt: "Mujhe Bengaluru mein AI developer ki job chahiye", expected: { role: "ai", location: "Bengaluru", originalLanguage: "hinglish" } },
  { id: "hg-02", prompt: "Pune mein backend developer ki naukri milegi?", expected: { role: "backend", location: "Pune", originalLanguage: "hinglish" } },
  { id: "hg-03", prompt: "Delhi mein frontend jobs batao", expected: { role: "frontend", location: "Delhi NCR", originalLanguage: "hinglish" } },
  { id: "hg-04", prompt: "Mumbai mein data engineer ki vacancy hai kya", expected: { role: "data", location: "Mumbai", originalLanguage: "hinglish" } },
  { id: "hg-05", prompt: "Hyderabad mein AI ML jobs chahiye", expected: { role: "ai", location: "Hyderabad", originalLanguage: "hinglish" } },
];

type Result = {
  id: string;
  prompt: string;
  interpreter: string;
  got: Expected | null;
  pass: boolean;
  fields: { role: boolean; location: boolean; language: boolean };
  latencyMs: number;
};

function score(got: Expected | null, exp: Expected, latencyMs: number, interpreter: string, c: Case): Result {
  const fields = {
    role: got?.role === exp.role,
    location: got?.location === exp.location,
    language: got?.originalLanguage === exp.originalLanguage,
  };
  return { id: c.id, prompt: c.prompt, interpreter, got, pass: Object.values(fields).every(Boolean), fields, latencyMs };
}

async function runLeg(name: string, fn: (p: string) => Promise<{ parsed: Expected | null }>): Promise<Result[]> {
  const results: Result[] = [];
  for (const c of GOLDEN) {
    const t0 = Date.now();
    try {
      const { parsed } = await fn(c.prompt);
      results.push(score(parsed, c.expected, Date.now() - t0, name, c));
    } catch (e) {
      results.push(score(null, c.expected, Date.now() - t0, name, c));
    }
  }
  return results;
}

async function main() {
  const report: Record<string, unknown> = { date: new Date().toISOString(), cases: GOLDEN.length };

  // Leg 1: deterministic fallback interpreter (always runs, no key needed)
  const fallback = await runLeg("fallback", async (p) => {
    const out = fallbackInterpret(p);
    return { parsed: { role: out.role, location: out.location, originalLanguage: out.originalLanguage } };
  });
  // Leg 1b: fallback via the real export (picks up key if present in env)
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  let modelLeg: Result[] = [];
  if (hasKey) {
    modelLeg = await runLeg("gemini", async (p) => {
      const out = await interpretPrompt(p);
      return { parsed: { role: out.role, location: out.location, originalLanguage: out.originalLanguage } };
    });
  }

  const summarize = (rs: Result[]) => ({
    accuracy: `${rs.filter((r) => r.pass).length}/${rs.length}`,
    byField: {
      role: `${rs.filter((r) => r.fields.role).length}/${rs.length}`,
      location: `${rs.filter((r) => r.fields.location).length}/${rs.length}`,
      language: `${rs.filter((r) => r.fields.language).length}/${rs.length}`,
    },
    medianLatencyMs: rs.map((r) => r.latencyMs).sort((a, b) => a - b)[Math.floor(rs.length / 2)],
  });

  const print = (rs: Result[]) => {
    for (const r of rs) {
      const mark = r.pass ? "PASS" : "FAIL";
      const miss = [
        !r.fields.role && `role(want ${GOLDEN.find((c) => c.id === r.id)!.expected.role})`,
        !r.fields.location && `loc(want ${GOLDEN.find((c) => c.id === r.id)!.expected.location})`,
        !r.fields.language && `lang(want ${GOLDEN.find((c) => c.id === r.id)!.expected.originalLanguage})`,
      ].filter(Boolean).join(", ");
      console.log(`${mark}  ${r.id}  ${r.latencyMs}ms  ${miss || ""}`);
    }
  };

  console.log(`\n== fallback interpreter ==`);
  print(fallback);
  const fs = summarize(fallback);
  console.log(JSON.stringify(fs));
  if (hasKey) {
    console.log(`\n== gemini-2.0-flash ==`);
    print(modelLeg);
    console.log(JSON.stringify(summarize(modelLeg)));
  } else {
    console.log(`\n== gemini-2.0-flash == skipped: GEMINI_API_KEY not set in environment`);
  }

  report.fallback = { summary: fs, results: fallback };
  report.gemini = hasKey
    ? { summary: summarize(modelLeg), results: modelLeg }
    : { skipped: "GEMINI_API_KEY not set" };
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(new URL("../evals", import.meta.url), { recursive: true });
  writeFileSync(new URL("../evals/report.json", import.meta.url), JSON.stringify(report, null, 2));
  console.log(`\nreport written to evals/report.json`);
}

main();
