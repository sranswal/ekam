"use client";

import { BRAND } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";

export default function AnnouncementBanner() {
  const { t } = useI18n();

  return (
    <div
      role="note"
      aria-label={t(
        "Hackathon credit and demo notice",
        "हैकाथॉन क्रेडिट और डेमो सूचना",
      )}
      className="w-full border-b border-white/10 text-white"
      style={{
        background:
          "linear-gradient(90deg, #18181b 0%, var(--accent-strong) 45%, #18181b 100%)",
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-1.5 font-medium">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase text-white/90">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            InfraShift
          </span>
          <span className="text-white/80">
            {t("Built with ", "")}
            <a
              href="https://ml.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white underline decoration-white/40 underline-offset-2 hover:decoration-white"
            >
              ML.ai
            </a>
            {t(" by ", " द्वारा ")}
            <a
              href="https://infrasity.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline decoration-white/40 underline-offset-2 hover:decoration-white"
            >
              Infrasity
            </a>
            {" & "}
            <a
              href="https://geekroom.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline decoration-white/40 underline-offset-2 hover:decoration-white"
            >
              Geek Room
            </a>
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <a
            href="#demo"
            className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-medium text-white transition hover:bg-white/25"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            {t("Watch Demo", "डेमो देखें")}
          </a>
          <a
            href={BRAND.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-white/85 hover:text-white transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
            </svg>
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
