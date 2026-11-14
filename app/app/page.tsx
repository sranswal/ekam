"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRAND, PERSONAS } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import AuthModal, { type AuthMode } from "./components/auth-modal";
import DemoSearch from "./components/demo-search";
import "./landing.css";

type User = { id: number; name?: string; email?: string };

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="ekam home">
      <img
        src="/ekam_logo.png"
        alt="ekam"
        width={94}
        height={30}
        className="h-7 w-auto"
        style={{ filter: "var(--logo-filter, none)" }}
      />
    </Link>
  );
}

export default function LandingPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModal, setAuthModal] = useState<AuthMode | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user: User } | null) => {
        if (alive) setUser(data?.user ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setAuthLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Deep link from the /login route handler and logged-out workspace visits.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    if (auth === "open") setAuthModal("login");
    if (auth === "signup") setAuthModal("signup");
  }, []);

  // When the modal is open the landing page scrolls beneath it - re-check auth after close.
  const openAuth = (mode: AuthMode) => setAuthModal(mode);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-5">
          <Wordmark />
          <div className="flex items-center gap-2 sm:gap-4">
            <div
              className="flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] p-0.5 text-xs"
              role="group"
              aria-label={t("Language", "भाषा")}
            >
              {(["en", "hi"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={`min-h-[36px] rounded-full px-2.5 sm:px-3 transition-colors ${
                    lang === l
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                      : "text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {l === "en" ? "EN" : "हिंदी"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === "dark" ? t("Switch to light mode", "लाइट मोड करें") : t("Switch to dark mode", "डार्क मोड करें")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors"
            >
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.5" />
                  <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            {user ? (
              <Link
                href="/workspace"
                className="btn-primary flex min-h-[44px] items-center rounded-full px-4 text-sm font-medium"
              >
                {t("Go to workspace", "वर्कस्पेस खोलें")}
              </Link>
            ) : authLoading ? (
              <span className="w-24" aria-hidden="true" />
            ) : (
              <button
                type="button"
                onClick={() => openAuth("signup")}
                className="btn-primary flex min-h-[44px] items-center rounded-full px-5 text-sm font-medium"
              >
                {t("Get Started", "शुरू करें")}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pb-20 pt-16 sm:pb-28 sm:pt-24">
        <div className="fade-up fade-up-1 flex justify-center">
          <span
            className="mono inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
            style={{
              borderColor: "var(--accent-fixed)",
              background: "var(--accent-dim)",
              color: "var(--accent)",
            }}
          >
            <span aria-hidden className="size-1.5 rounded-full" style={{ background: "var(--success)" }} />
            {t("free · in beta", "फ्री · बीटा में")}
          </span>
        </div>
        <h1 className="display fade-up fade-up-2 mt-6 max-w-4xl text-center text-4xl sm:text-6xl">
          {lang === "en" ? (
            <>
              Ask. <span style={{ color: "var(--accent)" }}>Get answers.</span>
            </>
          ) : (
            <>
              पूछो। <span style={{ color: "var(--accent)" }}>जवाब पाओ।</span>
            </>
          )}
        </h1>
        <p className="fade-up fade-up-3 mx-auto mt-6 max-w-2xl text-center text-lg text-[var(--muted)]">
          {t(
            "Just ask in your own words - English, Hindi or Hinglish. ekam finds jobs, homes, tenders and events near you, and shows you where every answer came from.",
            "अपने शब्दों में बस पूछिए - अंग्रेज़ी, हिंदी या हिंग्लिश में। ekam आपके लिए नौकरियां, घर, टेंडर और इवेंट ढूंढता है, और बताता है कि हर जवाब कहां से आया।",
          )}
        </p>

        {/* Ask-bar demo: animated typing + staged pipeline + mock verified rows */}
        <div className="fade-up fade-up-4 mx-auto mt-10 max-w-2xl">
          <DemoSearch />
          <p className="mt-3 text-center text-xs text-[var(--muted)]">
            {t("Typed or spoken. English or Hindi.", "टाइप या बोलकर। अंग्रेज़ी या हिंदी।")}
          </p>
        </div>
      </section>

        <hr className="rule mx-auto max-w-5xl" />

        {/* How it works - three plain steps */}
        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <p className="overline mono text-center">{t("How it works", "यह कैसे काम करता है")}</p>
          <h2 className="display mt-3 text-center text-3xl sm:text-4xl">
            {t("Ask, and it's done", "पूछिए, बस हो गया")}
          </h2>
          <div className="mt-3 text-center text-sm text-[var(--muted)]">
            {t("No forms, no filters, no digging through ten sites.", "ना फॉर्म, ना फ़िल्टर, ना दस वेबसाइटों में खुदाई।")}
          </div>
          <ol className="mt-12 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-0">
            {(
              [
                ["ask", t("Just ask", "बस पूछिए"), t("Say it or type it, in your own words - English, Hindi or Hinglish.", "अपने शब्दों में बोलिए या लिखिए - अंग्रेज़ी, हिंदी या हिंग्लिश।")],
                ["search", t("ekam searches", "ekam खोजता है"), t("It looks across trusted sources the moment you ask.", "आपके पूछते ही भरोसेमंद स्रोतों पर खोजता है।")],
                ["answers", t("You get answers", "आपको जवाब मिलते हैं"), t("Real results you can trust, each with a link to where it came from.", "भरोसेमंद असली नतीजे, हर एक के साथ उसके स्रोत का लिंक।")],
              ] as const
            ).map(([key, title, desc], i) => (
              <li key={key} className="flex items-start gap-6 sm:flex-1 sm:flex-col sm:gap-4">
                <div className="flex items-center w-full sm:w-auto">
                  <span className="mono flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs text-[var(--accent-contrast)]">
                    {i + 1}
                  </span>
                  {i < 2 && <span className="pipeline-line hidden sm:block" aria-hidden="true" />}
                </div>
                <div className="sm:pr-6">
                  <h3 className="mono text-sm font-medium">{title}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <hr className="rule mx-auto max-w-5xl" />

        {/* Who it's for - five personas, asymmetric list */}
        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <div className="grid gap-12 sm:grid-cols-[1fr_2fr]">
            <div>
              <p className="overline mono">{t("Who it's for", "किसके लिए है")}</p>
              <h2 className="display mt-3 text-3xl sm:text-4xl">
                {t("Four kinds of people, one question each", "चार तरह के लोग, हर एक का एक सवाल")}
              </h2>
              <p className="mt-4 text-sm text-[var(--muted)]">
                {t(
                  "ekam is not a job board. What it finds depends on the question you ask.",
                  "ekam कोई जॉब बोर्ड नहीं है। जो मिलता है, वो आपके सवाल पर निर्भर है।",
                )}
              </p>
            </div>
            <ul className="mt-2 grid gap-4 sm:grid-cols-2">
              {PERSONAS.map((p) => (
                <li key={p.id} className="card p-5 transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-base font-semibold">{t(p.label, p.hi)}</h3>
                    <span className="mono text-xs text-[var(--faint)]">0{PERSONAS.findIndex((x) => x.id === p.id) + 1}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-[var(--muted)]">{p.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <hr className="rule mx-auto max-w-5xl" />

        {/* Why you can trust the results */}
        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <p className="overline mono">{t("Why trust it", "भरोसा क्यों")}</p>
          <h2 className="display mt-3 max-w-2xl text-3xl sm:text-4xl">
            {t("Every answer shows where it came from", "हर जवाब बताता है कि वो कहां से आया")}
          </h2>
          <div className="mt-12">
            {[
              {
                k: t("Source-linked", "स्रोत-लिंक्ड"),
                v: t("Each result carries the exact page it came from.", "हर नतीजे के साथ उसका मूल पेज जुड़ा रहता है।"),
              },
              {
                k: t("Fresh by default", "हमेशा ताज़ा"),
                v: t("Results are collected on demand, not cached for months.", "नतीजे मांग पर इकट्ठा होते हैं, महीनों पुराने नहीं।"),
              },
              {
                k: t("Duplicates removed", "डुप्लिकेट हटे"),
                v: t("The same posting never shows up twice.", "एक ही पोस्टिंग दोबारा नहीं दिखती।"),
              },
              {
                k: t("Nothing hidden", "कुछ छिपाया नहीं"),
                v: t("If a listing looks incomplete, it's clearly marked - not quietly dropped.", "अगर कोई लिस्टिंग अधूरी लगे, तो साफ़ निशान के साथ दिखती है - चुपचाप हटाई नहीं जाती।"),
              },
            ].map((row, i) => (
              <div key={row.k} className="row-line grid gap-1 py-6 sm:grid-cols-[48px_220px_1fr] sm:gap-6">
                <span
                  aria-hidden
                  className="mono hidden size-8 items-center justify-center rounded-full text-xs font-semibold sm:flex"
                  style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                >
                  {i + 1}
                </span>
                <h3 className="text-base font-semibold">{row.k}</h3>
                <p className="text-sm text-[var(--muted)] sm:text-base">{row.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-4 pt-8 sm:pt-12">
          <div
            className="mx-auto max-w-5xl overflow-hidden rounded-[var(--radius-xl)] px-6 py-16 text-center sm:py-20"
            style={{
              background: "linear-gradient(135deg, var(--accent-strong), var(--accent-hover))",
              color: "#ffffff",
            }}
          >
            <p
              className="mono text-xs uppercase tracking-[0.2em]"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              {t("Free, no credit card", "मुफ़्त, कोई कार्ड नहीं")}
            </p>
            <h2 className="display mx-auto mt-4 max-w-2xl text-3xl sm:text-4xl">
              {t("Ask your first question today.", "आज अपना पहला सवाल पूछें।")}
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {user ? (
                <Link
                  href="/workspace"
                  className="flex min-h-[44px] items-center rounded-full bg-white px-6 text-sm font-semibold transition-transform hover:scale-[1.02]"
                  style={{ color: "var(--accent-strong)" }}
                >
                  {t("Go to workspace", "वर्कस्पेस खोलें")}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuth("signup")}
                  className="flex min-h-[44px] items-center rounded-full bg-white px-6 text-sm font-semibold transition-transform hover:scale-[1.02]"
                  style={{ color: "var(--accent-strong)" }}
                >
                  {t("Get Started Free", "मुफ़्त में शुरू करें")}
                </button>
              )}
              <Link
                href="/workspace"
                className="flex min-h-[44px] items-center rounded-full border border-white/40 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {t("Explore the workspace", "वर्कस्पेस देखें")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-5xl px-5 py-10">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-sm text-[var(--muted)]">© 2026 ekam</p>
          <a
            href={BRAND.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
            </svg>
            GitHub
          </a>
        </div>
      </footer>

      {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />}
    </div>
  );
}
