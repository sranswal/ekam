"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import AuthHeader from "./auth-header";

export default function SiteHeader() {
  const { t } = useI18n();
  const pathname = usePathname();
  const links = [
    { href: "/workspace", label: t("Search", "खोज"), hi: "/workspace" },
    { href: "/profile", label: t("Profile", "प्रोफ़ाइल") },
  ];

  return (
    <header className="mb-10">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/workspace"
          className="flex items-center gap-2 rounded"
          aria-label={t("ekam home", "ekam होम")}
        >
          <Image
            src="/ekam_logo.png"
            alt=""
            width={28}
            height={28}
            className="rounded"
            priority
          />
          <span className="mono text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>
            ekam
          </span>
        </Link>
        <AuthHeader />
      </div>
      <nav className="mt-4 flex items-center gap-2" aria-label={t("Main", "मुख्य")}>
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className="mono inline-flex min-h-11 items-center rounded px-3 text-sm transition-colors hover:bg-black/30 dark:hover:bg-white/10"
              style={{
                border: `1px solid ${active ? "var(--accent-dim)" : "var(--border)"}`,
                color: active ? "var(--accent)" : "var(--muted)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
