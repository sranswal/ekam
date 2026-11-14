"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "hi";

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Pick between an English and a Hindi string inline: t("Sign in", "साइन इन"). */
  t: (en: string, hi: string) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("ekam-lang");
    if (stored === "hi" || stored === "en") setLangState(stored);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem("ekam-lang", next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback((en: string, hi: string) => (lang === "hi" ? hi : en), [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <LanguageProvider>");
  return ctx;
}
