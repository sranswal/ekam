"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

type User = { id: number; email: string; name: string };

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

export default function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user: User } | null) => {
        if (alive && data?.user) setUser(data.user);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
    router.replace("/login");
    router.refresh();
  }

  const links = [
    { href: "/workspace", label: t("Search", "खोज") },
    { href: "/profile", label: t("Profile", "प्रोफ़ाइल") },
  ];

  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg)] w-full">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-5">
        <div className="flex items-center gap-4 sm:gap-6">
          <Wordmark />
          <nav className="flex items-center gap-1 sm:gap-2" aria-label={t("Navigation", "नेविगेशन")}>
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[38px] items-center rounded-full px-3.5 text-xs sm:text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--surface-2)] text-[var(--accent)] font-semibold border border-[var(--accent-dim)]"
                      : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language selector matching landing page */}
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
                className={`min-h-[32px] sm:min-h-[36px] rounded-full px-2.5 sm:px-3 transition-colors ${
                  lang === l
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)] font-medium"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {l === "en" ? "EN" : "हिंदी"}
              </button>
            ))}
          </div>

          {/* Theme toggle matching landing page */}
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? t("Switch to light mode", "लाइट मोड करें") : t("Switch to dark mode", "डार्क मोड करें")}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors"
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

          {/* User logout / signin */}
          {user ? (
            <button
              type="button"
              onClick={logout}
              className="flex min-h-[36px] sm:min-h-[40px] items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 sm:px-4 text-xs sm:text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            >
              {t("Log out", "लॉग आउट")}
            </button>
          ) : (
            <Link
              href="/login"
              className="btn-primary flex min-h-[36px] sm:min-h-[40px] items-center rounded-full px-4 text-xs sm:text-sm font-medium"
            >
              {t("Sign in", "साइन इन")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
