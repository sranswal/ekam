"use client";

import { useTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("Switch to dark mode", "डार्क मोड करें")}
      aria-pressed={dark}
      title={t("Theme", "थीम")}
      className="mono inline-flex h-11 w-11 items-center justify-center rounded text-base transition-colors hover:bg-black/30 dark:hover:bg-white/10"
      style={{ border: "1px solid var(--border)", color: "var(--text)" }}
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
