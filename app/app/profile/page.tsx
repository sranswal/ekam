"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { PERSONAS } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";
import AuthHeader from "../components/auth-header";

type Profile = {
  headline: string | null;
  skills: string | null;
  preferredCity: string | null;
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
  const [profile, setProfile] = useState<Profile>({
    headline: "",
    skills: "",
    preferredCity: "",
    resumeText: "",
    resumeFileName: null,
  });
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

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
  const personaLabel = persona ? t(persona.label, persona.hi) : null;

  useEffect(() => {
    if (!authReady || !authUser) return;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = (await res.json()) as { profile: Profile | null };
        if (data.profile) {
          setProfile({
            headline: data.profile.headline ?? "",
            skills: data.profile.skills ?? "",
            preferredCity: data.profile.preferredCity ?? "",
            resumeText: data.profile.resumeText ?? "",
            resumeFileName: data.profile.resumeFileName,
          });
          setFileName(data.profile.resumeFileName);
        }
      } catch {
        setError("could not load profile");
        setStatus("error");
      } finally {
        setLoading(false);
      }
    })();
  }, [authReady, authUser, router]);

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
        body: JSON.stringify({ ...profile, resumeFileName: fileName }),
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
      <main className="min-h-dvh p-6">
        <div className="mx-auto max-w-2xl space-y-4" aria-busy>
          <div className="h-8 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-64 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
      </main>
    );
  }

  const field =
    "mt-1 w-full rounded px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[--accent]";
  const fieldStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
  };

  return (
    <main className="min-h-dvh px-4 py-10" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-mono text-2xl tracking-tight" style={{ color: "var(--text)" }}>
            {t("Your profile", "आपकी प्रोफ़ाइल")}
          </h1>
          <AuthHeader />
        </div>
        {personaLabel && (
          <p
            className="mono mt-3 inline-flex items-center rounded px-2 py-1 text-xs tracking-widest uppercase"
            style={{ border: "1px solid var(--accent-dim)", color: "var(--accent)" }}
          >
            {personaLabel}
          </p>
        )}
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          {t(
            "Your resume shapes future searches and the voice agent's questions.",
            "आपका रिज़ूमे आगे की खोजों और वॉइस एजेंट के सवालों को आकार देता है।"
          )}
        </p>
        <form
          onSubmit={save}
          className="mt-6 space-y-5 rounded-lg p-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}
        >
          <label className="block text-sm" style={{ color: "var(--muted)" }}>
            {t("Headline", "हेडलाइन")}
            <input
              value={profile.headline ?? ""}
              onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
              placeholder={t("Backend developer, 3 years, Node + Postgres", "बैकएंड डेवलपर, 3 साल, Node + Postgres")}
              className={field}
              style={fieldStyle}
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm" style={{ color: "var(--muted)" }}>
              {t("Skills (comma separated)", "कौशल (कॉमा से अलग)")}
              <input
                value={profile.skills ?? ""}
                onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
                placeholder="node, react, sql"
                className={field}
                style={fieldStyle}
              />
            </label>
            <label className="block text-sm" style={{ color: "var(--muted)" }}>
              {t("Preferred city", "पसंदीदा शहर")}
              <input
                value={profile.preferredCity ?? ""}
                onChange={(e) => setProfile({ ...profile, preferredCity: e.target.value })}
                placeholder="Noida"
                className={field}
                style={fieldStyle}
              />
            </label>
          </div>
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
              onChange={(e) => setProfile({ ...profile, resumeText: e.target.value })}
              rows={12}
              placeholder={t("…or paste your resume / profile text here", "…या अपना रिज़ूमे यहां पेस्ट करें")}
              className={`${field} mt-3 font-mono text-xs leading-5`}
              style={fieldStyle}
            />
          </div>
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
              className="min-h-11 rounded px-5 font-medium transition hover:opacity-90 active:opacity-80 disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-contrast)", borderRadius: "var(--radius)" }}
            >
              {status === "saving" ? t("Saving…", "सहेज रहे हैं…") : t("Save profile", "प्रोफ़ाइल सहेजें")}
            </button>
            {status === "saved" && (
              <span className="text-sm" style={{ color: "var(--accent)" }}>
                {t("Saved", "सहेजा गया")}
              </span>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
