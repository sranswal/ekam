"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PERSONAS } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";
import SiteHeader from "../components/site-header";
import VoiceSession from "../components/voice-session";

type Interpreted = {
  topic: string;
  vertical: string;
  role: string;
  location: string;
  keywords: string[];
  originalLanguage: string;
  translatedPrompt: string | null;
  hindiTranslation: string | null;
  recencyDays: number | null;
  source: "gemini" | "fallback";
};
type Query = {
  id: number;
  prompt: string;
  interpreted: Interpreted | null;
  status: string;
  collected: number;
  kept: number;
  duplicates: number;
  flagged: number;
  error: string | null;
  createdAt: string;
};
type AuthUser = { id: number; name: string; persona: string | null; onboardedAt: string | null };
type Listing = {
  id: number;
  title: string;
  company: string;
  location: string | null;
  jobType: string | null;
  tags: string[];
  sourceUrl: string;
  incomplete: boolean;
  publicationDate: string | null;
};

const DEFAULT_EXAMPLES = [
  "AI developer jobs in Bengaluru",
  "मुझे Noida में flat दिखाओ",
  "Frontend roles for Delhi NCR",
  "Data analyst positions, remote",
];
const PERSONA_EXAMPLES: Record<string, string[]> = {
  jobseeker: [
    "AI developer jobs in Bengaluru",
    "Frontend roles for Delhi NCR",
    "Data analyst positions, remote",
  ],
  student: [
    "Internships for CS students in Pune",
    "Part-time data entry work in Jaipur",
    "Entry level tech jobs in Hyderabad",
  ],
  sme: [
    "Show tenders in Delhi for office supplies",
    "Office space for rent in Noida under ₹30,000",
    "Verified catering vendors in Mumbai",
  ],
  agency: [
    "Bulk supplier of laptops in Chennai",
    "Latest road construction tenders in Bihar",
    "Verified event venues in Hyderabad for 200 people",
  ],
};
export default function Workspace() {
  const router = useRouter();
  const { t } = useI18n();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [running, setRunning] = useState(false);
  const [query, setQuery] = useState<Query | null>(null);
  const [rows, setRows] = useState<Listing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlyComplete, setOnlyComplete] = useState(false);
  const [city, setCity] = useState("");
  const [maxAgeDays, setMaxAgeDays] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let res = await fetch("/api/auth");
        if (!res.ok && res.status !== 401) {
          // fallback for builds where GET /api/auth is not implemented yet
          res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "me" }),
          });
        }
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = (await res.json()) as { user: AuthUser | null };
        if (!data.user) {
          router.replace("/login");
          return;
        }
        if (!data.user.persona) {
          router.replace("/onboarding");
          return;
        }
        setAuthUser(data.user);
      } catch {
        router.replace("/login");
        return;
      } finally {
        setAuthReady(true);
      }
    })();
  }, [router]);

  const persona = PERSONAS.find((p) => p.id === authUser?.persona) ?? null;
  const personaExamples =
    (authUser?.persona && PERSONA_EXAMPLES[authUser.persona]) || DEFAULT_EXAMPLES;
  const greeting = authUser
    ? t(`Namaste, ${authUser.name}`, `नमस्ते, ${authUser.name}`)
    : t("all in one. ask, verify, export.", "सब एक जगह। पूछें, सत्यापित करें, निर्यात करें।");
  const personaLabel = persona ? t(persona.label, persona.hi) : null;

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const cityOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => (r.location ?? "").trim()).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const age = Number(maxAgeDays);
    return rows.filter((r) => {
      if (onlyComplete && r.incomplete) return false;
      if (city && (r.location ?? "").trim() !== city) return false;
      if (!Number.isNaN(age) && age > 0 && r.publicationDate) {
        const ageDays = (Date.now() - new Date(r.publicationDate).getTime()) / 86_400_000;
        if (ageDays > age) return false;
      }
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        (r.location ?? "").toLowerCase().includes(q) ||
        r.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [rows, search, onlyComplete, city, maxAgeDays]);

  async function runQuery(p: string) {
    if (running) return;
    setRunning(true);
    setError(null);
    setQuery(null);
    setRows([]);
    setSearch("");
    setCity("");
    setMaxAgeDays("");
    try {
      const res = await fetch("/api/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      const data = (await res.json()) as { id?: number; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "request failed");

      pollRef.current = window.setInterval(async () => {
        const r = await fetch(`/api/queries/${data.id}`);
        if (!r.ok) return;
        const d = (await r.json()) as { query: Query; listings: Listing[] };
        setQuery(d.query);
        setRows(d.listings);
        if (d.query.status !== "running") {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setRunning(false);
        }
      }, 400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "something went wrong");
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <VoiceSession
          open={voiceOpen}
          onOpenChange={setVoiceOpen}
          onSearch={(p) => void runQuery(p)}
          queryResult={
            query
              ? {
                  id: query.id,
                  prompt: query.prompt,
                  status: query.status,
                  kept: query.kept,
                  top: rows.slice(0, 3).map((r) => ({
                    title: r.title,
                    company: r.company,
                    location: r.location,
                  })),
                }
              : null
          }
        />
      <div className="mb-8">
        <div>
          <h1 className="mono text-2xl font-bold leading-tight sm:text-4xl" style={{ color: "var(--text)" }}>
            {greeting}
          </h1>
          {personaLabel && (
            <p
              className="mono mt-2 inline-flex items-center rounded px-2 py-1 text-xs tracking-widest uppercase"
              style={{ border: "1px solid var(--accent-dim)", color: "var(--accent)" }}
            >
              {personaLabel}
            </p>
          )}
        </div>
        <p className="mt-3 max-w-2xl text-sm sm:text-base" style={{ color: "var(--muted)" }}>
          {t(
            "Type or speak a question in English, Hindi or Hinglish - jobs, properties, tenders or events. Every result is verified, with a clickable source.",
            "अंग्रेज़ी, हिंदी या हिंग्लिश में प्रश्न लिखें या बोलें - नौकरियां, प्रॉपर्टी, टेंडर या इवेंट्स। हर नतीजा सत्यापित, क्लिक करने योग्य स्रोत के साथ।"
          )}
        </p>
      </div>

      {/* Prompt card */}
      <section className="card p-4 shadow-[var(--shadow-2)] sm:p-6" aria-labelledby="ask-heading">
        <h2 id="ask-heading" className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("What are you looking for?", "आप क्या खोज रहे हैं?")}
        </h2>
        <form
          className="mt-3 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (prompt.trim()) runQuery(prompt);
          }}
        >
          <label className="sr-only" htmlFor="prompt-input">
            Data request
          </label>
          <input
            id="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g. "AI developer jobs in Bengaluru this week"'
            className="mono min-h-[44px] flex-1 rounded-full px-4 text-sm"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-soft)", color: "var(--text)" }}
            maxLength={500}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              disabled={running}
              className="btn-secondary flex min-h-[44px] items-center rounded-full px-4 text-sm font-medium disabled:opacity-50"
            >
              {t("◉ Talk to ekam", "◉ ekam से बात करें")}
            </button>
            <button
              type="submit"
              disabled={running || !prompt.trim()}
              className="btn-primary flex min-h-[44px] items-center rounded-full px-6 text-sm font-semibold disabled:opacity-50"
            >
              {running ? t("Searching…", "खोज रहा है…") : t("Search", "खोजें")}
            </button>
          </div>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {personaExamples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setPrompt(ex);
                runQuery(ex);
              }}
              disabled={running}
              className="mono rounded px-2.5 py-1.5 text-xs transition-colors hover:bg-black/30 disabled:opacity-50"
              style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
            >
              {ex}
            </button>
          ))}
        </div>
      </section>

      {/* Search status */}
      {(running || (query && query.status !== "running") || error) && (
        <section className="mt-6" aria-label="Search status">
          {running && (
            <p className="mono text-xs" style={{ color: "var(--muted)" }}>
              {t("Searching verified sources…", "सत्यापित स्रोतों में खोज रहा है…")}
            </p>
          )}
          {error && (
            <p className="mono mt-2 text-xs" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
        </section>
      )}

      {/* Dashboard stats */}
      {query && query.status !== "running" && (
        <section className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Dataset stats">
          {[
            ["Results found", query.collected],
            ["Verified", query.kept],
            ["Duplicates removed", query.duplicates],
            ["Flagged incomplete", query.flagged],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="rounded px-4 py-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="mono text-xl font-bold" style={{ color: "var(--accent)" }}>
                {String(value)}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                {label}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Results */}
      {rows.length > 0 && (
        <section className="mt-6" aria-label="Results">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="mono text-sm font-bold uppercase tracking-wider">
              {t("Dataset", "डेटासेट")} <span style={{ color: "var(--muted)" }}>({filtered.length}/{rows.length} {t("rows", "पंक्तियां")})</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex min-h-11 items-center gap-2 text-xs" style={{ color: "var(--muted)" }}>
                <input
                  type="checkbox"
                  checked={onlyComplete}
                  onChange={(e) => setOnlyComplete(e.target.checked)}
                  className="h-4 w-4"
                  style={{ accentColor: "var(--accent)" }}
                />
                {t("Complete rows only", "सिर्फ़ पूरी पंक्तियां")}
              </label>              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label="Filter by location"
                className="mono min-h-11 rounded px-2 text-sm"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="">{t("All locations", "सभी शहर")}</option>
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={maxAgeDays}
                onChange={(e) => setMaxAgeDays(e.target.value)}
                aria-label="Filter by posted date"
                className="mono min-h-11 rounded px-2 text-sm"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <option value="">{t("Any date", "कोई भी तारीख")}</option>
                <option value="7">{t("Last 7 days", "पिछले 7 दिन")}</option>
                <option value="30">{t("Last 30 days", "पिछले 30 दिन")}</option>
              </select>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search rows…", "पंक्तियां खोजें…")}
                aria-label="Search rows"
                className="mono min-h-11 rounded px-3 text-sm"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              />
              <a
                href={`/api/queries/${query?.id}/export`}
                className="btn-primary mono flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold"
              >
                ↓ CSV
              </a>
              <a
                href={`/api/queries/${query?.id}/export?format=json`}
                className="mono flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold"
                style={{ border: "1px solid var(--border)", color: "var(--text)" }}
              >
                ↓ JSON
              </a>
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="mt-4 rounded px-4 py-6 text-center text-sm" style={{ background: "var(--surface)", border: "1px dashed var(--border)", color: "var(--muted)" }}>
              No rows match this filter. Clear the search or uncheck “complete rows only”.
            </p>
          ) : (
              <ul className="mt-3 flex flex-col gap-2">
              {filtered.slice(0, 50).map((r) => (
                <li
                  key={r.id}
                  className="card px-4 py-3 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold">{r.title}</p>
                    <p className="mono text-xs" style={{ color: "var(--muted)" }}>
                      {r.company}
                      {r.location ? ` · ${r.location}` : ""}
                    </p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {r.incomplete ? (
                      <span className="badge badge-flagged">⚠ {t("Incomplete", "अधूरी")}</span>
                    ) : (
                      <span className="badge badge-verified">✓ {t("Verified", "सत्यापित")}</span>
                    )}
                    {r.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="mono rounded px-1.5 py-0.5 text-[11px]"
                        style={{ background: "var(--surface-2)", color: "var(--muted)" }}
                      >
                        {tag}
                      </span>
                    ))}
                    <a
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary mono ml-auto flex min-h-[36px] items-center rounded-full px-4 text-xs font-semibold"
                    >
                      {t("View Source ↗", "स्रोत देखें ↗")}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <footer className="mono mt-12 border-t pt-4 text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        ekam · every result verified, with a clickable source
      </footer>
    </main>
  </div>
);
}
