"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { PERSONAS, type PersonaId } from "@/lib/brand";
import { PERSONA_FIELDS, RESUME_PERSONAS } from "@/lib/persona";
import { useI18n } from "@/lib/i18n";
import SiteHeader from "../components/site-header";
import DictationButton from "../components/dictation-button";

type Profile = {
  data: Record<string, string>;
  resumeText: string | null;
  resumeFileName: string | null;
};

type AuthUser = { id: number; name: string; persona: string | null; onboardedAt: string | null };

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({ data: {}, resumeText: "", resumeFileName: null });
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth");
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

  const personaId = (authUser?.persona ?? null) as PersonaId | null;
  const persona = PERSONAS.find((p) => p.id === personaId) ?? null;
  const personaLabel = persona ? t(persona.label, persona.hi) : null;
  const fields = personaId ? PERSONA_FIELDS[personaId] : [];

  useEffect(() => {
    if (!authReady || !authUser) return;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = (await res.json()) as { profile: (Profile & { headline?: string | null; skills?: string | null; preferredCity?: string | null }) | null };
        if (data.profile) {
          const data_ = { ...(data.profile.data ?? {}) };
          // profiles saved before persona-specific forms exist
          for (const key of ["headline", "skills", "preferredCity"] as const) {
            const legacy = data.profile[key as keyof typeof data.profile] as string | null | undefined;
            if (legacy && !data_[key]) data_[key] = legacy;
          }
          setProfile({ data: data_, resumeText: data.profile.resumeText ?? "", resumeFileName: data.profile.resumeFileName });
          setFileName(data.profile.resumeFileName);
        }
      } catch {
        setError(t("could not load profile", "प्रोफ़ाइल लोड नहीं हुई"));
        setStatus("error");
      } finally {
        setLoading(false);
      }
    })();
  }, [authReady, authUser, router, t]);

  function setField(key: string, value: string) {
    setProfile((p) => ({ ...p, data: { ...p.data, [key]: value } }));
    setStatus("idle");
  }

  async function switchPersona(next: string) {
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: next }),
    });
    router.refresh();
    window.location.reload();
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(txt|md|csv)$/i.test(file.name)) {
      setError(t("use a .txt, .md or .csv resume file (plain text)", ".txt, .md या .csv फ़ाइल चुनें"));
      setStatus("error");
      return;
    }
    if (file.size > 200_000) {
      setError(t("file is larger than 200 KB", "फ़ाइल 200 KB से बड़ी है"));
      setStatus("error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((p) => ({ ...p, resumeText: String(reader.result ?? "") }));
      setFileName(file.name);
      setStatus("idle");
      setError(null);
    };
    reader.readAsText(file);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaData: profile.data,
          resumeText: profile.resumeText,
          resumeFileName: fileName,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "could not save");
        setStatus("error");
        return;
      }
      setStatus("saved");
    } catch {
      setError(t("network error - try again", "नेटवर्क त्रुटि - फिर कोशिश करें"));
      setStatus("error");
    }
  }

  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
          <div className="space-y-4" aria-busy>
            <div className="h-8 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <div className="h-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            <div className="h-64 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          </div>
        </main>
      </div>
    );
  }

  const field =
    "mt-1 w-full rounded px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--accent]";
  const fieldStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };
  const showResume = personaId !== null && RESUME_PERSONAS.includes(personaId);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-mono text-2xl tracking-tight" style={{ color: "var(--text)" }}>
          {t("Your profile", "आपकी प्रोफ़ाइल")}
        </h1>
        {personaLabel && (
          <p
            className="mono mt-3 inline-flex items-center rounded px-2 py-1 text-xs tracking-widest uppercase"
            style={{ border: "1px solid var(--accent-dim)", color: "var(--accent)" }}
          >
            {personaLabel}
          </p>
        )}
        <label className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
          {t("Not you? Switch:", "आप नहीं? बदलें:")}
          <select
            value={personaId ?? ""}
            onChange={(e) => switchPersona(e.target.value)}
            className="min-h-11 rounded px-2 py-1 text-sm"
            style={fieldStyle}
          >
            {PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {t(p.label, p.hi)}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          {persona?.blurb}{" "}
          {t(
            "Tap the mic next to any field to fill it by speaking.",
            "किसी भी खाने के पास माइक दबाकर बोलकर भरें।"
          )}
        </p>
        <form
          onSubmit={save}
          className="mt-6 space-y-5 rounded-lg p-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}
        >
          {fields.map((f) => (
            <label key={f.key} className="block text-sm" style={{ color: "var(--muted)" }}>
              <span className="flex items-center justify-between gap-2">
                <span>{t(f.labelEn, f.labelHi)}</span>
                <DictationButton onText={(text) => setField(f.key, text)} />
              </span>
              {f.textarea ? (
                <textarea
                  value={profile.data[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  rows={3}
                  placeholder={t(f.placeholderEn, f.placeholderHi)}
                  className={field}
                  style={fieldStyle}
                />
              ) : (
                <input
                  value={profile.data[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={t(f.placeholderEn, f.placeholderHi)}
                  className={field}
                  style={fieldStyle}
                />
              )}
            </label>
          ))}
          {showResume && (
            <div className="text-sm" style={{ color: "var(--muted)" }}>
              {t("Resume", "रिज़ूमे")}
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <label
                  className="inline-flex min-h-11 cursor-pointer items-center rounded px-4 leading-6 transition focus-within:outline focus-within:outline-2 focus-within:outline-[--accent]"
                  style={{ border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  {t("Upload file (.txt / .md / .csv)", "फ़ाइल अपलोड करें (.txt / .md / .csv)")}
                  <input type="file" accept=".txt,.md,.csv,text/plain" onChange={onFile} className="sr-only" />
                </label>
                {fileName && (
                  <span style={{ color: "var(--accent)" }}>
                    {t(`${fileName} loaded`, `${fileName} लोड हुआ`)}
                  </span>
                )}
              </div>
              <textarea
                value={profile.resumeText ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, resumeText: e.target.value }))}
                rows={12}
                placeholder={t("…or paste your resume / profile text here", "…या अपना रिज़ूमे यहां पेस्ट करें")}
                className={`${field} mt-3 font-mono text-xs leading-5`}
                style={fieldStyle}
              />
            </div>
          )}
          {error && (
            <p
              role="alert"
              className="rounded px-3 py-2 text-sm"
              style={{ background: "var(--danger-bg, rgba(220,38,38,0.1))", border: "1px solid rgba(220,38,38,0.4)", color: "var(--danger, #dc2626)" }}
            >
              {error}
            </p>
          )}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={status === "saving"}
              className="btn-primary flex min-h-[44px] items-center rounded-full px-6 text-sm font-semibold disabled:opacity-50"
            >
              {status === "saving" ? t("Saving…", "सहेज रहे हैं…") : t("Save profile", "प्रोफ़ाइल सहेजें")}
            </button>
            {status === "saved" && (
              <span className="badge badge-verified">{t("Saved", "सहेजा गया")}</span>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
