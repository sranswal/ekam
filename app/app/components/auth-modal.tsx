"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { PERSONAS } from "@/lib/brand";

type User = { id: number; email: string; name: string; persona: string | null; onboardedAt: string | null };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthMode = "login" | "signup";

export default function AuthModal({
  initialMode,
  onClose,
}: {
  initialMode: AuthMode;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [persona, setPersona] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const emailInvalid = email.length > 0 && !EMAIL_RE.test(email.trim());
  const passwordInvalid = password.length > 0 && password.length < 8;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!EMAIL_RE.test(email.trim()) || password.length < 8 || (mode === "signup" && !name.trim())) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          name: mode === "signup" ? name.trim() : undefined,
          email: email.trim(),
          password,
          persona: mode === "signup" && persona ? persona : undefined,
        }),
      });
      const data = (await res.json()) as { user?: User; error?: string };
      if (!res.ok) {
        setError(data.error ?? t("something went wrong", "कुछ गड़बड़ हो गई"));
        return;
      }
      const user = data.user;
      const needsOnboarding =
        mode === "signup" ? user?.onboardedAt == null : user?.persona == null || user.onboardedAt == null;
      router.push(needsOnboarding ? "/onboarding" : "/workspace");
      router.refresh();
    } catch {
      setError(t("network error — try again", "नेटवर्क त्रुटि — फिर कोशिश करें"));
    } finally {
      setBusy(false);
    }
  }

  const emailError = touched.email && emailInvalid ? t("Enter a valid email address.", "मान्य ईमेल पता दर्ज करें।") : null;
  const passwordError =
    touched.password && passwordInvalid
      ? t("Password must be at least 8 characters.", "पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।")
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? t("Log in", "लॉग इन") : t("Create account", "अकाउंट बनाएं")}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="mono text-lg tracking-tight text-white">ekam</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Back to home", "होम पर वापस")}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-2)]">
          <div
            role="tablist"
            aria-label={t("Authentication", "प्रमाणीकरण")}
            className="mb-5 grid grid-cols-2 gap-1 rounded-[var(--radius)] bg-[var(--surface-2)] p-1"
          >
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`min-h-9 rounded-[var(--radius)] px-3 text-sm transition-colors ${
                  mode === m
                    ? "bg-[var(--surface)] font-medium text-[var(--text)] shadow-[var(--shadow-1)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {m === "login" ? t("Log in", "लॉग इन") : t("Create account", "अकाउंट बनाएं")}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === "signup" && (
              <label className="block text-sm text-[var(--muted)]">
                {t("Name", "नाम")}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--text)]"
                />
              </label>
            )}
            <label className="block text-sm text-[var(--muted)]">
              {t("Email", "ईमेल")}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, email: true }))}
                required
                autoComplete="email"
                aria-invalid={emailError ? true : undefined}
                className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--text)]"
              />
              {emailError && (
                <span role="alert" className="mt-1 block text-xs text-[var(--danger)]">
                  {emailError}
                </span>
              )}
            </label>
            <label className="block text-sm text-[var(--muted)]">
              {t("Password", "पासवर्ड")}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((s) => ({ ...s, password: true }))}
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                aria-invalid={passwordError ? true : undefined}
                className="mt-1 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[var(--text)]"
              />
              {passwordError ? (
                <span role="alert" className="mt-1 block text-xs text-[var(--danger)]">
                  {passwordError}
                </span>
              ) : (
                <span className="mt-1 block text-xs">{t("At least 8 characters.", "कम से कम 8 अक्षर।")}</span>
              )}
            </label>

            {mode === "signup" && (
              <fieldset>
                <legend className="text-sm text-[var(--muted)]">
                  {t("What brings you to ekam?", "आप ekam पर क्यों आए?")}{" "}
                  <span className="text-xs">({t("optional", "वैकल्पिक")})</span>
                </legend>
                <div className="mt-2 grid gap-2">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={persona === p.id}
                      onClick={() => setPersona(persona === p.id ? null : p.id)}
                      className={`flex items-center justify-between rounded-[var(--radius)] border px-3 py-2 text-left text-sm transition-colors ${
                        persona === p.id
                          ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--text)]"
                          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]"
                      }`}
                    >
                      <span>
                        <span className="font-medium text-[var(--text)]">{t(p.label, p.hi)}</span>
                        <span className="ms-2 text-xs">{t(p.blurb, p.blurb)}</span>
                      </span>
                      <span
                        aria-hidden
                        className={`size-3.5 shrink-0 rounded-full border ${
                          persona === p.id ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--muted)]"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-dim)] px-3 py-2 text-sm text-[var(--danger)]"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full min-h-11 rounded-[var(--radius)] px-4 font-medium"
            >
              {busy
                ? t("Working…", "काम चल रहा है…")
                : mode === "login"
                  ? t("Log in", "लॉग इन")
                  : t("Create account", "अकाउंट बनाएं")}
            </button>
            <p className="text-sm text-[var(--muted)]">
              {mode === "login" ? t("New here?", "पहली बार?") : t("Already have an account?", "पहले से खाता है?")}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError(null);
                }}
                className="text-[var(--text)] underline underline-offset-2"
              >
                {mode === "login" ? t("Create an account", "खाता बनाएँ") : t("Log in", "लॉग इन")}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
