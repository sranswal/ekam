"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { PERSONAS } from "@/lib/brand";

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [persona, setPersona] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/auth", { cache: "no-store" });
        if (meRes.status === 401) {
          router.replace("/login");
          return;
        }
        if (!meRes.ok) throw new Error("auth check failed");
        const obRes = await fetch("/api/onboarding", { cache: "no-store" });
        if (obRes.status === 401) {
          router.replace("/login");
          return;
        }
        if (!obRes.ok) throw new Error("onboarding check failed");
        const ob = (await obRes.json()) as { persona: string | null; onboardedAt: string | null };
        if (ob.onboardedAt != null) {
          router.replace("/workspace");
          return;
        }
        if (!cancelled) {
          setPersona(ob.persona);
          setReady(true);
        }
      } catch {
        if (!cancelled) setError(t("Something went wrong. Please refresh.", "कुछ गड़बड़ हो गई। कृपया रीफ़्रेश करें।"));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish() {
    if (!persona) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona }),
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t("Something went wrong. Try again.", "कुछ गड़बड़ हो गई। फिर कोशिश करें।"));
        return;
      }
      router.push("/workspace");
      router.refresh();
    } catch {
      setError(t("Network error - try again.", "नेटवर्क त्रुटि - फिर कोशिश करें।"));
    } finally {
      setBusy(false);
    }
  }

  if (!ready && !error) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <p className="mono text-sm text-[var(--muted)]">{t("Loading…", "लोड हो रहा है…")}</p>
      </main>
    );
  }

  if (error && !ready) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <Link href="/" className="display flex items-center justify-center gap-2 text-2xl tracking-tight text-[var(--text)] mb-8">
          <img
            src="/ekam_logo.png"
            alt="ekam"
            width={72}
            height={24}
            className="h-6 w-auto"
            style={{ filter: "var(--logo-filter, none)" }}
          />
        </Link>

        <section className="space-y-2 text-center">
          <h1 className="display text-3xl sm:text-5xl">
            {t("What will you use ekam for?", "आप ekam का उपयोग किस लिए करेंगे?")}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {t(
              "We'll tailor what you see. You can change this anytime from your profile.",
              "हम आपके लिए नतीजे अनुकूलित करेंगे। आप इसे कभी भी प्रोफ़ाइल से बदल सकते हैं।",
            )}
          </p>
        </section>

        <fieldset className="mt-8">
          <legend className="sr-only">{t("Choose one", "एक चुनें")}</legend>
          <div role="radiogroup" className="grid gap-4 sm:grid-cols-2">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={persona === p.id}
                onClick={() => setPersona(p.id)}
                className={`card relative p-5 text-left transition-all duration-200 ${
                  persona === p.id
                    ? "border-[var(--accent)] shadow-[var(--shadow-2)]"
                    : "hover:-translate-y-0.5"
                }`}
              >
                <span
                  aria-hidden
                  className="mono absolute right-4 top-4 inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wider"
                  style={
                    persona === p.id
                      ? { background: "var(--accent)", color: "var(--accent-contrast)" }
                      : { background: "var(--surface-2)", color: "var(--faint)" }
                  }
                >
                  {persona === p.id ? `✓ ${t("Selected", "चुना गया")}` : t("Select", "चुनें")}
                </span>
                <span
                  aria-hidden
                  className="flex size-11 items-center justify-center rounded-full"
                  style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                >
                  {p.id === "jobseeker" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <rect x="3" y="7" width="18" height="13" rx="2" />
                      <path d="M8 7V5a4 4 0 0 1 8 0v2" strokeLinecap="round" />
                    </svg>
                  ) : p.id === "student" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="m12 4 10 5-10 5L2 9l10-5Z" strokeLinejoin="round" />
                      <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" strokeLinecap="round" />
                    </svg>
                  ) : p.id === "sme" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8-.8-.7-2.2-.6-3 .8Z" strokeLinecap="round" />
                      <path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.7 12.7 0 0 1 21.5 2c0 2.7-.8 7.5-6 10.5a22 22 0 0 1-3.5 2.5Z" strokeLinejoin="round" />
                      <path d="M9 12H4s.6-3.3 2-4.5c1.6-1.3 4 0 4 0" strokeLinecap="round" />
                      <path d="M12 15v5s3.3-.6 4.5-2c1.3-1.6 0-4 0-4" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.8 2.8M16.2 16.2 19 19M19 5l-2.8 2.8M7.8 16.2 5 19" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
                <span className="mt-3 block font-semibold text-[var(--text)]">{t(p.label, p.hi)}</span>
                <span className="mt-1 block text-sm text-[var(--muted)]">{p.blurb}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius)] border px-3 py-2 text-sm"
            style={{ borderColor: "var(--danger)", background: "var(--danger-dim)", color: "var(--danger)" }}
          >
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={finish}
            disabled={busy || !persona}
            className="btn-primary flex min-h-[44px] items-center rounded-full px-6 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? t("Working…", "काम चल रहा है…") : t("Take me to ekam", "मुझे ekam तक ले चलो")} →
          </button>
          <p className="mono text-center text-xs text-[var(--faint)]">
            {t(
              "You can easily switch or update your persona anytime in your profile.",
              "आप अपना पर्सोना कभी भी प्रोफ़ाइल में बदल सकते हैं।",
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
