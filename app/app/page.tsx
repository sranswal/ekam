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

const PIPELINE = ["interpret", "fetch", "verify", "store", "serve"] as const;

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
          <p className="overline fade-up fade-up-1 mono">{t("One question. Every source.", "एक सवाल। हर स्रोत।")}</p>
          <h1 className="display fade-up fade-up-2 mt-4 max-w-3xl text-4xl sm:text-6xl">
            {t("all in one", "सब एक जगह।")}
          </h1>
          <p className="fade-up fade-up-3 mt-6 max-w-2xl text-lg text-[var(--muted)]">
            {t(
              "ekam turns a plain-language question - in English or Hindi - into a verified, source-linked dataset: jobs, properties, tenders, events and more.",
              "ekam आपके साधारण सवाल - अंग्रेज़ी या हिंदी में - को सत्यापित, स्रोत-लिंक्ड डेटासेट में बदलता है: नौकरियां, प्रॉपर्टी, टेंडर, इवेंट और भी बहुत कुछ।",
            )}
          </p>

          {/* Ask-bar demo: animated typing + staged pipeline + mock verified rows */}
          <div className="fade-up fade-up-4 mt-10 max-w-2xl">
            <DemoSearch />
            <p className="mt-3 text-xs text-[var(--muted)]">
              {t("Typed or spoken. English or Hindi.", "टाइप या बोलकर। अंग्रेज़ी या हिंदी।")}
            </p>
          </div>
        </section>

        <hr className="rule mx-auto max-w-5xl" />

        {/* How it works - horizontal pipeline */}
        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <p className="overline mono">{t("How it works", "यह कैसे काम करता है")}</p>
          <h2 className="display mt-3 text-3xl sm:text-4xl">
            {t("From question to dataset, in one pass", "सवाल से डेटासेट तक, एक ही बार में")}
          </h2>
          <ol className="mt-12 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-0">
            {PIPELINE.map((stage, i) => (
              <li key={stage} className="flex items-start gap-6 sm:flex-1 sm:flex-col sm:gap-4">
                <div className="flex items-center w-full sm:w-auto">
                  <span className="mono flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs text-[var(--accent-contrast)]">
                    {i + 1}
                  </span>
                  {i < PIPELINE.length - 1 && <span className="pipeline-line hidden sm:block" aria-hidden="true" />}
                </div>
                <div className="sm:pr-6">
                  <h3 className="mono text-sm font-medium first-letter:uppercase">{stage}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {
                      {
                        interpret: t("Parse the language, the intent, the vertical.", "भाषा, इरादा और वर्टिकल समझें।"),
                        fetch: t("Sweep the live web for matching listings.", "मैचिंग लिस्टिंग्स के लिए वेब खंगालें।"),
                        verify: t("Check every row against its source.", "हर पंक्ति को उसके स्रोत से जांचें।"),
                        store: t("Deduplicate and keep only what holds.", "डुप्लिकेट हटाएं, सिर्फ़ सही रखें।"),
                        serve: t("Deliver a clean, source-linked table.", "साफ़, स्रोत-लिंक्ड टेबल दें।"),
                      }[stage]
                    }
                  </p>
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
                  "ekam is not a job board. The vertical comes from the question you ask.",
                  "ekam कोई जॉब बोर्ड नहीं है। वर्टिकल आपके सवाल से तय होता है।",
                )}
              </p>
            </div>
            <ul>
              {PERSONAS.map((p) => (
                <li key={p.id} className="row-line py-5 first:pt-0 last:pb-0 sm:py-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-base font-medium">
                      {t(p.label, p.hi)}
                    </h3>
                    <span className="mono text-xs text-[var(--muted)]">0{PERSONAS.findIndex((x) => x.id === p.id) + 1}</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{p.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <hr className="rule mx-auto max-w-5xl" />

        {/* Why verified - source-linked rows */}
        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <p className="overline mono">{t("Why verified", "सत्यापन क्यों")}</p>
          <h2 className="display mt-3 max-w-2xl text-3xl sm:text-4xl">
            {t("Every row answers to its source", "हर पंक्ति अपने स्रोत के ज़िम्मेदार है")}
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
                k: t("Flagged, not hidden", "छिपाया नहीं, फ़्लैग किया"),
                v: t("Incomplete rows stay visible - clearly marked.", "अधूरी पंक्तियां दिखती रहती हैं - साफ़ निशान के साथ।"),
              },
            ].map((row) => (
              <div key={row.k} className="row-line grid gap-1 py-6 sm:grid-cols-[220px_1fr] sm:gap-8">
                <h3 className="text-base font-medium">{row.k}</h3>
                <p className="text-sm text-[var(--muted)] sm:text-base">{row.v}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-y border-[var(--border)] bg-[var(--surface-2)]">
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
            <h2 className="display max-w-xl text-3xl sm:text-4xl">
              {t("Ask your first question today.", "आज अपना पहला सवाल पूछें।")}
            </h2>
            {user ? (
              <Link
                href="/workspace"
                className="btn-primary flex min-h-[44px] shrink-0 items-center rounded-full px-6 text-sm font-medium"
              >
                {t("Go to workspace", "वर्कस्पेस खोलें")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuth("signup")}
                className="btn-primary flex min-h-[44px] shrink-0 items-center rounded-full px-6 text-sm font-medium"
              >
                {t("Get Started", "शुरू करें")}
              </button>
            )}
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
