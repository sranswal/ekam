"use client";

import { useEffect, useRef, useState } from "react";

type Row = { title: string; source: string; meta: string };

const DEMOS: { chip: string; stages: string[]; rows: Row[] }[] = [
  {
    chip: "mujhe Noida mein flat dikhao",
    stages: ["Hindi → property · Noida", "fetching listings…", "verifying 3 sources…"],
    rows: [
      { title: "2BHK flat, Sector 62 - ₹68L", source: "99acres.com", meta: "verified · just now" },
      { title: "3BHK flat, Sector 128 - ₹1.1Cr", source: "housing.com", meta: "verified · just now" },
      { title: "1BHK rental, Sector 18 - ₹18k/mo", source: "magicbricks.in", meta: "verified · just now" },
    ],
  },
  {
    chip: "AI developer jobs in Bengaluru",
    stages: ["English → jobs · Bengaluru", "fetching listings…", "verifying 3 sources…"],
    rows: [
      { title: "Senior AI Engineer - Infra · ₹35-50 LPA", source: "careers.page", meta: "verified · just now" },
      { title: "ML Engineer, LLM platform · ₹28-40 LPA", source: "company-hr.in", meta: "verified · just now" },
      { title: "AI Developer (GenAI) · ₹22-32 LPA", source: "jobs-portal.co", meta: "verified · just now" },
    ],
  },
  {
    chip: "upcoming tenders in Jaipur",
    stages: ["English → tenders · Jaipur", "fetching listings…", "verifying 3 sources…"],
    rows: [
      { title: "Ward 12 road resurfacing - ₹4.2Cr", source: "jnumauction.gov.in", meta: "verified · just now" },
      { title: "Solar rooftop, govt college - ₹86L", source: "tup.gov.in", meta: "verified · just now" },
      { title: "City bus stop refurbishment - ₹31L", source: "rtc.jhar.gov.in", meta: "verified · just now" },
    ],
  },
];

const TYPE_MS = 55;
const STAGE_MS = 750;
const HOLD_MS = 2600;

export default function DemoSearch() {
  const [demoIdx, setDemoIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "stages" | "results">("typing");
  const [stage, setStage] = useState(0);
  const [rowIdx, setRowIdx] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (reduced.current) {
      // Skip animation: show the finished result set for each demo in turn.
      setTyped(DEMOS[demoIdx].chip);
      setPhase("results");
      const t = setTimeout(() => setDemoIdx((i) => (i + 1) % DEMOS.length), HOLD_MS);
      timers.current.push(t);
      return () => clearTimeout(t);
    }

    const demo = DEMOS[demoIdx];
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      setTyped("");
      setPhase("typing");
      setStage(0);
      setRowIdx(0);
      for (let c = 1; c <= demo.chip.length; c++) {
        timers.current.push(setTimeout(() => setTyped(demo.chip.slice(0, c)), c * TYPE_MS));
      }
      timers.current.push(
        setTimeout(() => setPhase("stages"), demo.chip.length * TYPE_MS + 300),
      );
      demo.stages.forEach((_, s) => {
        timers.current.push(setTimeout(() => setStage(s), (demo.chip.length * TYPE_MS + 300) + s * STAGE_MS));
      });
      timers.current.push(
        setTimeout(() => setPhase("results"), demo.chip.length * TYPE_MS + 300 + demo.stages.length * STAGE_MS),
      );
      demo.rows.forEach((_, r) => {
        timers.current.push(
          setTimeout(
            () => setRowIdx(r + 1),
            demo.chip.length * TYPE_MS + 300 + demo.stages.length * STAGE_MS + 250 * (r + 1),
          ),
        );
      });
      timers.current.push(
        setTimeout(
          () => setDemoIdx((i) => (i + 1) % DEMOS.length),
          demo.chip.length * TYPE_MS + 300 + demo.stages.length * STAGE_MS + 250 * demo.rows.length + HOLD_MS,
        ),
      );
    };
    run();
    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [demoIdx]);

  const demo = DEMOS[demoIdx];

  return (
    <div className="ask-bar p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.8-3.8" strokeLinecap="round" />
        </svg>
        <p className="caret min-h-[24px] text-base sm:text-lg" aria-hidden="true">
          {typed}
        </p>
      </div>

      <div aria-live="polite" className="sr-only">
        {phase === "results" ? demo.rows.map((r) => `${r.title} - ${r.source}`).join(", ") : demo.chip}
      </div>

      {phase === "stages" && (
        <div className="mt-4 flex flex-wrap items-center gap-2" aria-hidden="true">
          {demo.stages.map((s, i) => (
            <span
              key={s}
              className={`mono rounded-full border px-3 py-1 text-xs transition-opacity duration-200 ${
                i <= stage ? "border-[var(--accent)] text-[var(--accent)] opacity-100" : "border-[var(--border)] text-[var(--muted)] opacity-40"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {phase === "results" && (
        <ul className="mt-4 divide-y divide-[var(--border)]" aria-hidden="true">
          {demo.rows.slice(0, rowIdx).map((r) => (
            <li key={r.title} className="flex items-baseline justify-between gap-3 py-2.5">
              <span className="text-sm">{r.title}</span>
              <span className="mono shrink-0 text-xs text-[var(--muted)]">
                {r.source} · {r.meta}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="flex min-h-[44px] items-center px-2 text-xs text-[var(--muted)]">Try:</span>
        {DEMOS.map((d, i) => (
          <button
            key={d.chip}
            type="button"
            onClick={() => setDemoIdx(i)}
            aria-pressed={i === demoIdx}
            className={`mono flex min-h-[44px] items-center rounded-full border px-3 text-xs transition-colors sm:text-sm ${
              i === demoIdx
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            {d.chip}
          </button>
        ))}
      </div>
    </div>
  );
}
