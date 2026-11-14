"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

type VoiceTurn = { role: "user" | "agent"; text: string; lang: string | null };

type Phase = "idle" | "listening" | "thinking" | "speaking";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string } & { isFinal: boolean }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function pickRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as SpeechRecognitionCtor | null;
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const lower = lang.toLowerCase();
  const exact = voices.find((v) => v.lang.toLowerCase() === lower);
  if (exact) return exact;
  const prefix = lower.split("-")[0];
  return voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ?? null;
}

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Tap to start talking",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

// Always-mounted dock: a mic pill when closed, a live conversation panel when open.
// Search requests go through onSearch so results appear on the workspace screen
// while the conversation keeps going.
export default function VoiceSession({
  open,
  onOpenChange,
  onSearch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (prompt: string) => void;
}) {
  const { t, lang } = useI18n();
  const [supported, setSupported] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const mutedRef = useRef(false);
  const turnsRef = useRef<VoiceTurn[]>([]);
  const wantListeningRef = useRef(false);
  const finalizeRef = useRef<number | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    setSupported(pickRecognitionCtor() !== null);
  }, []);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const speak = useCallback((text: string, speakLang: string) => {
    if (mutedRef.current || typeof window === "undefined" || !window.speechSynthesis) {
      setPhaseBoth("listening");
      startListeningSafe();
      return;
    }
    setPhaseBoth("speaking");
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = speakLang;
    const voice = pickVoice(speakLang);
    if (voice) utter.voice = voice;
    utter.rate = 1.05;
    // Chrome sometimes never fires onend/onerror; resume listening on our own
    // so the panel cannot freeze on "Speaking…".
    let finished = false;
    const resume = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(watchdog);
      setPhaseBoth("listening");
      startListeningSafe();
    };
    const watchdog = window.setTimeout(resume, Math.max(5000, text.length * 120));
    utter.onend = resume;
    utter.onerror = resume;
    window.speechSynthesis.speak(utter);
  }, []);

  const startListeningSafe = useCallback(() => {
    if (!wantListeningRef.current || mutedRef.current) return;
    if (phaseRef.current === "listening") return;
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.start();
      setPhaseBoth("listening");
    } catch {
      // start() throws if already started; ignore
    }
  }, []);

  const runTurn = useCallback(
    async (userText: string, heardLang: string) => {
      wantListeningRef.current = false;
      recRef.current?.stop();
      setPhaseBoth("thinking");
      setError(null);
      const history = turnsRef.current;
      try {
        const res = await fetch("/api/voice/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history, userText, pendingResults: null }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? `agent ${res.status}`);
        }
        const reply = (await res.json()) as {
          reply: string;
          replyHindi: string | null;
          action: { type: string; prompt: string } | null;
        };
        setTurns((prev) => {
          const next = [
            ...prev,
            { role: "user" as const, text: userText, lang: heardLang },
            { role: "agent" as const, text: reply.reply, lang: reply.replyHindi ? "hi-IN" : heardLang },
          ];
          turnsRef.current = next.slice(-24);
          return next;
        });

        wantListeningRef.current = true;
        if (reply.action?.type === "run_query") {
          // Results render on the workspace screen; keep talking meanwhile.
          onSearch(reply.action.prompt);
          speak(
            t(
              `Searching now for ${reply.action.prompt}. Results are on your screen.`,
              `${reply.action.prompt} के लिए खोज रहा हूं। नतीजे आपकी स्क्रीन पर हैं।`
            ),
            heardLang.startsWith("hi") ? "hi-IN" : heardLang
          );
          return;
        }
        const replyLang = reply.replyHindi && heardLang.startsWith("hi") ? "hi-IN" : heardLang;
        speak(reply.replyHindi && heardLang.startsWith("hi") ? reply.replyHindi : reply.reply, replyLang);
      } catch (err) {
        const message = err instanceof Error ? err.message : "voice turn failed";
        setError(message);
        wantListeningRef.current = true;
        speak("Sorry, kuch galat ho gaya. Dobara boliye.", "hi-IN");
      }
    },
    [speak, onSearch, t]
  );

  // Keep the effect below free of unstable deps: `onSearch` comes from the
  // parent as a fresh closure on every render, so any dep on `runTurn` would
  // tear down and recreate the (already-started) recognizer mid-listen and
  // freeze the panel on a static "Listening…". Read the latest turn runner
  // through a ref instead.
  const tRef = useRef(t);
  tRef.current = t;
  const runTurnRef = useRef(runTurn);
  runTurnRef.current = runTurn;

  useEffect(() => {
    if (!supported) return;
    const Ctor = pickRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      setHeard(text);
      setLevel(2 + ((text.length * 7) % 6)); // cheap live-motion tick while words stream in
      if (finalizeRef.current) window.clearTimeout(finalizeRef.current);
      const final = text.trim();
      if (!final) return;
      finalizeRef.current = window.setTimeout(() => {
        setHeard("");
        setLevel(0);
        void runTurnRef.current(final, rec.lang);
      }, 1200);
    };
    rec.onend = () => {
      if (wantListeningRef.current && phaseRef.current === "listening") {
        try {
          rec.start();
        } catch {
          // ignore
        }
      }
    };
    rec.onerror = (event) => {
      const code = event.error ?? "";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError(tRef.current("Microphone permission denied. Allow the mic and try again.", "माइक की अनुमति नहीं मिली। अनुमति देकर फिर कोशिश करें।"));
        wantListeningRef.current = false;
      } else if (code === "audio-capture") {
        setError(tRef.current("No microphone found. Connect one and try again.", "कोई माइक नहीं मिला। जोड़कर फिर कोशिश करें।"));
        wantListeningRef.current = false;
      } else if (code === "network") {
        setError(tRef.current("Speech service network error. Check your connection.", "स्पीच सर्विस में नेटवर्क गड़बड़ी। कनेक्शन जांचें।"));
      }
      // "no-speech" / "aborted" are transient; onend restarts listening.
    };
    recRef.current = rec;
    // If we were listening when a previous recognizer was replaced, keep going.
    if (wantListeningRef.current && phaseRef.current === "listening") {
      try {
        rec.start();
      } catch {
        // ignore
      }
    }
    return () => {
      if (finalizeRef.current) window.clearTimeout(finalizeRef.current);
      try {
        rec.stop();
      } catch {
        // ignore
      }
      window.speechSynthesis?.cancel();
    };
  }, [supported, lang]);

  const begin = () => {
    wantListeningRef.current = true;
    setPhaseBoth("listening");
    startListeningSafe();
  };

  const pause = () => {
    wantListeningRef.current = false;
    recRef.current?.stop();
    setPhaseBoth("idle");
  };

  const interrupt = () => {
    window.speechSynthesis?.cancel();
    wantListeningRef.current = true;
    setPhaseBoth("listening");
    startListeningSafe();
  };

  // Closed state: floating mic pill, always reachable.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label={t("Talk to ekam", "ekam से बात करें")}
        className="fixed bottom-5 right-5 z-40 flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-lg transition hover:scale-105"
        style={{ background: "var(--accent)", color: "var(--bg)", boxShadow: "var(--shadow-2)" }}
      >
        <span aria-hidden className={phase !== "idle" ? "animate-pulse" : ""}>◉</span>
        {t("Talk to ekam", "ekam से बात करें")}
      </button>
    );
  }

  if (!supported) {
    return (
      <div className="card fixed bottom-5 right-5 z-40 max-w-xs" style={{ padding: 16 }}>
        <p>{t("Voice mode needs Chrome, Edge or another Chromium browser with microphone access.", "वॉइस मोड के लिए Chrome/Edge और माइक चाहिए।")}</p>
        <button className="btn mt-2" onClick={() => onOpenChange(false)}>
          {t("Back to typing", "टाइपिंग पर वापस")}
        </button>
      </div>
    );
  }

  const live = phase === "listening" || phase === "speaking";

  return (
    <section
      aria-label={t("Voice conversation with ekam", "ekam से वॉइस बातचीत")}
      className="card fixed bottom-5 right-5 z-40 w-[min(92vw,380px)]"
      style={{ padding: 16, boxShadow: "var(--shadow-2)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <strong className="mono text-sm">{t("ekam is live", "ekam लाइव है")}</strong>
        <button
          className="btn btn-ghost min-h-[36px] text-xs"
          aria-label={t("Close voice panel", "वॉइस पैनल बंद करें")}
          onClick={() => (phase === "idle" ? onOpenChange(false) : pause())}
        >
          {t("Minimize", "छोटा करें")}
        </button>
      </div>

      {/* Live indicator: bars that move while ekam listens or speaks */}
      <div className="mt-3 flex items-center gap-3" role="status" aria-live="polite">
        <div className={`flex h-6 items-end gap-1 ${live ? "animate-pulse" : ""}`} aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-1 rounded-full transition-all duration-200"
              style={{
                background: live ? "var(--accent)" : "var(--muted)",
                height: live ? `${6 + ((level * (i + 2) + i * 5) % 18)}px` : "4px",
              }}
            />
          ))}
        </div>
        <p className="mono text-xs" style={{ color: "var(--muted)" }}>
          {phase === "idle" ? t("Tap Start talking", "शुरू करने के लिए दबाएं") : t(PHASE_LABEL[phase], PHASE_LABEL[phase])}
          {muted ? ` · ${t("muted", "म्यूट")}` : ""}
        </p>
      </div>

      {heard && (
        <p className="mt-2 text-sm italic" style={{ color: "var(--text)" }}>
          &ldquo;{heard}&rdquo;
        </p>
      )}

      <div className="mt-2 flex max-h-48 flex-col gap-2 overflow-y-auto text-sm">
        {turns.slice(-6).map((turn, i) => (
          <p
            key={i}
            className="m-0"
            style={{ textAlign: turn.role === "user" ? "right" : "left", color: turn.role === "user" ? "var(--text)" : "var(--muted)" }}
          >
            <strong>{turn.role === "user" ? t("You", "आप") : "ekam"}:</strong> {turn.text}
          </p>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {phase === "speaking" ? (
          <button className="btn min-h-[44px] flex-1" onClick={interrupt}>
            {t("Interrupt", "बीच में बोलें")}
          </button>
        ) : phase === "listening" ? (
          <button className="btn min-h-[44px] flex-1" onClick={pause}>
            {t("Pause", "रोकें")}
          </button>
        ) : (
          <button className="btn btn-primary min-h-[44px] flex-1" onClick={begin}>
            {t("Start talking", "बात शुरू करें")}
          </button>
        )}
        <button
          className="btn btn-ghost min-h-[44px]"
          onClick={() => {
            mutedRef.current = !mutedRef.current;
            setMuted(mutedRef.current);
          }}
        >
          {muted ? t("Unmute", "अनम्यूट") : t("Mute", "म्यूट")}
        </button>
      </div>
    </section>
  );
}
