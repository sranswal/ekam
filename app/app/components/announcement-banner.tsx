"use client";

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
      className="w-full text-white"
      style={{
        background:
          "linear-gradient(90deg, var(--accent-strong), var(--accent) 55%, var(--accent-hover))",
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-0.5 px-4 py-2 text-center">
        <p className="text-xs font-semibold sm:text-sm">
          {t("Built with ", "")}
          <a
            href="https://ml.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-white/50 underline-offset-2 hover:decoration-white"
          >
            ML.ai
          </a>
          {t(" at InfraShift · hackathon by ", "")}
          <a
            href="https://infrasity.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-white/50 underline-offset-2 hover:decoration-white"
          >
            Infrasity
          </a>
          {t(" and ", "")}
          <a
            href="https://geekroom.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-white/50 underline-offset-2 hover:decoration-white"
          >
            Geek Room
          </a>
        </p>
        <p className="text-[11px] text-white/85 sm:text-xs">
          {t(
            "Demo build — all API keys have been revoked. Watch the demo video or explore the code on GitHub.",
            "डेमो बिल्ड — सभी API keys रद्द कर दी गई हैं। डेमो वीडियो देखें या GitHub पर कोड देखें।",
          )}
        </p>
      </div>
    </div>
  );
}
