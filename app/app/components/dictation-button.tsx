"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

function pickRecognitionCtor(): (new () => RecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => RecognitionLike) | null;
}

// Press-to-speak mic for any text field: transcript is appended to the field.
export default function DictationButton({ onText }: { onText: (text: string) => void }) {
  const { t } = useI18n();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<RecognitionLike | null>(null);
  const supported = useRef(false);

  useEffect(() => {
    supported.current = !!pickRecognitionCtor();
    return () => {
      recRef.current?.stop();
    };
  }, []);

  if (!supported.current) return null;

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = pickRecognitionCtor();
    if (!Ctor) {
      setError(t("Voice input is not supported in this browser.", "इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है।"));
      return;
    }
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      const clean = text.trim();
      if (clean) onText(clean);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed") {
        setError(t("Microphone permission denied.", "माइक की अनुमति नहीं मिली।"));
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setError(null);
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        aria-label={listening ? t("Stop voice input", "वॉइस इनपुट बंद करें") : t("Speak this field", "बोलकर भरें")}
        className={`inline-flex size-9 items-center justify-center rounded-full transition-colors ${
          listening ? "animate-pulse" : "hover:bg-black/10 dark:hover:bg-white/10"
        }`}
        style={{
          border: "1px solid var(--border)",
          color: listening ? "var(--danger, #dc2626)" : "var(--muted)",
          background: listening ? "var(--accent-dim)" : "transparent",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0M12 19v3" strokeLinecap="round" />
        </svg>
      </button>
      {error && (
        <span role="alert" className="text-xs" style={{ color: "var(--danger, #dc2626)" }}>
          {error}
        </span>
      )}
    </span>
  );
}
