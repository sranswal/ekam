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
      <div className="w-full max-w-md">
        <Link href="/" className="mono block text-center text-2xl tracking-tight text-[var(--text)] mb-6">
          ekam
        </Link>

        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-2)]">
          <section className="space-y-4">
            <h1 className="mono text-lg text-[var(--text)]">
              {t("What will you use ekam for?", "आप ekam का उपयोग किस लिए करेंगे?")}
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {t(
                "We'll tailor what you see. You can change this anytime from your profile.",
                "हम आपके लिए नतीजे अनुकूलित करेंगे। आप इसे कभी भी प्रोफ़ाइल से बदल सकते हैं।",
              )}
            </p>
            <fieldset>
              <legend className="text-sm text-[var(--muted)]">{t("Choose one", "एक चुनें")}</legend>
              <div role="radiogroup" className="mt-2 grid gap-2">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={persona === p.id}
                    onClick={() => setPersona(p.id)}
                    className={`rounded-[var(--radius)] border p-3 text-left transition-colors ${
                      persona === p.id
                        ? "border-[var(--accent)] bg-[var(--accent-dim)]"
                        : "border-[var(--border)] hover:border-[var(--muted)]"
                    }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-medium text-[var(--text)]">{t(p.label, p.hi)}</span>
                      <span
                        aria-hidden
                        className={`size-3.5 shrink-0 rounded-full border ${
                          persona === p.id
                            ? "border-[var(--accent)] bg-[var(--accent)]"
                            : "border-[var(--muted)]"
                        }`}
                      />
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">{p.blurb}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-dim)] px-3 py-2 text-sm text-[var(--danger)]"
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={finish}
              disabled={busy || !persona}
              className="btn-primary min-h-11 rounded-[var(--radius)] px-5 text-sm font-medium disabled:opacity-50"
            >
              {busy ? t("Working…", "काम चल रहा है…") : t("Take me to ekam", "मुझे ekam तक ले चलो")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
