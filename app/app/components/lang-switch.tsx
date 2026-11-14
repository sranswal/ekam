"use client";

import { useI18n } from "@/lib/i18n";

export default function LangSwitch() {
  const { lang, setLang, t } = useI18n();

  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      aria-label={t("Switch language to Hindi", "भाषा बदलें")}
      title={t("Switch language", "भाषा बदलें")}
      className="mono inline-flex h-11 items-center justify-center rounded px-3 text-sm font-semibold transition-colors hover:bg-black/30 dark:hover:bg-white/10"
      style={{ border: "1px solid var(--border)", color: "var(--text)" }}
    >
      {lang === "en" ? "EN" : "हिं"}
    </button>
  );
}
