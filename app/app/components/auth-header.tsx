"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";
import ThemeToggle from "./theme-toggle";
import LangSwitch from "./lang-switch";

type User = { id: number; email: string; name: string };

export default function AuthHeader() {
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "me" }),
        });
        const data = (await res.json()) as { user: User | null };
        setUser(data.user);
      } catch {
        /* header auth is best-effort */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
    router.refresh();
  }

  if (!loaded) return <div className="h-11 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" aria-hidden />;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <ThemeToggle />
      <LangSwitch />
      {user ? (
        <>
          <Link
            href="/profile"
            className="mono inline-flex min-h-11 items-center rounded px-3 text-sm transition-colors hover:bg-black/30 dark:hover:bg-white/10"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
            title={user.email}
          >
            {t("Profile", "प्रोफ़ाइल")}
          </Link>
          <button
            onClick={logout}
            className="mono inline-flex min-h-11 items-center rounded px-3 text-sm transition-colors hover:bg-black/30 dark:hover:bg-white/10"
            style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
          >
            {t("Log out", "लॉग आउट")}
          </button>
        </>
      ) : (
        <Link
          href="/login"
          className="btn-primary mono inline-flex min-h-11 items-center rounded px-4 text-sm font-semibold"
        >
          {t("Sign in", "साइन इन")}
        </Link>
      )}
    </div>
  );
}
