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
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<ArrayLike<{ transcript: string } & { isFinal: boolean }>>;
  }) => void) | null;
  onstart: (() => void) | null;
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
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
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

export type QueryResult = {
  id: number;
  prompt: string;
  status: string;
  kept: number;
  top: Array<{ title: string; company: string; location: string | null }>;
};

// Always-mounted dock: a mic pill when closed, a live conversation panel when open.
// Search requests go through onSearch so results appear on the workspace screen
// while the conversation keeps going.
export default function VoiceSession({
  open,
  onOpenChange,
  onSearch,
  queryResult,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (prompt: string) => void;
  queryResult?: QueryResult | null;
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
  const isRecognizingRef = useRef(false);
  const finalizeRef = useRef<number | null>(null);
  const activeUtterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const spokenResultRef = useRef<number | null>(null);

  useEffect(() => {
    setSupported(pickRecognitionCtor() !== null);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const startListeningSafe = useCallback(() => {
    if (!wantListeningRef.current || mutedRef.current) return;
    setPhaseBoth("listening");
    const rec = recRef.current;
    if (!rec || isRecognizingRef.current) return;
    try {
      rec.start();
    } catch {
      // already started or transitioning
    }
  }, []);

  const speak = useCallback(
    (text: string, speakLang: string) => {
      if (mutedRef.current || typeof window === "undefined" || !window.speechSynthesis) {
        wantListeningRef.current = true;
        startListeningSafe();
        return;
      }
      setPhaseBoth("speaking");
      // Stop speech recognition while speaking to avoid self-echoing
      try {
        recRef.current?.stop();
      } catch {}

      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      activeUtterRef.current = utter;
      utter.lang = speakLang;
      const voice = pickVoice(speakLang);
      if (voice) utter.voice = voice;
      utter.rate = 1.05;

      // Chrome sometimes never fires onend/onerror; watchdog ensures listening resumes
      let finished = false;
      const resume = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(watchdog);
        activeUtterRef.current = null;
        wantListeningRef.current = true;
        startListeningSafe();
      };
      const watchdog = window.setTimeout(resume, Math.max(4000, text.length * 100));
      utter.onend = resume;
      utter.onerror = resume;
      window.speechSynthesis.speak(utter);
    },
    [startListeningSafe]
  );

  const runTurn = useCallback(
    async (userText: string, heardLang: string) => {
      wantListeningRef.current = false;
      try {
        recRef.current?.stop();
      } catch {}
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

        const agentText = reply.replyHindi && heardLang.startsWith("hi") ? reply.replyHindi : reply.reply;
        setTurns((prev) => {
          const next = [
            ...prev,
            { role: "user" as const, text: userText, lang: heardLang },
            { role: "agent" as const, text: agentText, lang: reply.replyHindi ? "hi-IN" : heardLang },
          ];
          turnsRef.current = next.slice(-24);
          return next;
        });

        if (reply.action?.type === "run_query") {
          const queryToRun = reply.action.prompt.trim() || userText.trim();
          // Results render on the workspace screen; agent continues talking
          onSearch(queryToRun);
          const searchAck = heardLang.startsWith("hi")
            ? `${queryToRun} के लिए खोज रहा हूँ। नतीजे आपकी स्क्रीन पर आ रहे हैं।`
            : `Searching now for ${queryToRun}. Results are appearing on your screen.`;
          speak(searchAck, heardLang.startsWith("hi") ? "hi-IN" : heardLang);
          return;
        }

        const replyLang = reply.replyHindi && heardLang.startsWith("hi") ? "hi-IN" : heardLang;
        speak(agentText, replyLang);
      } catch (err) {
        const message = err instanceof Error ? err.message : "voice turn failed";
        setError(message);
        wantListeningRef.current = true;
        speak("Sorry, kuch galat ho gaya. Dobara boliye.", "hi-IN");
      }
    },
    [speak, onSearch]
  );

  const tRef = useRef(t);
  tRef.current = t;
  const runTurnRef = useRef(runTurn);
  runTurnRef.current = runTurn;

  // Recognizer lifecycle
  useEffect(() => {
    if (!supported) return;
    const Ctor = pickRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      isRecognizingRef.current = true;
    };

    rec.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      if (!text.trim()) {
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript;
        }
      }
      setHeard(text);
      setLevel(2 + ((text.length * 7) % 6)); // live visual tick
      if (finalizeRef.current) window.clearTimeout(finalizeRef.current);
      const final = text.trim();
      if (!final) return;
      finalizeRef.current = window.setTimeout(() => {
        setHeard("");
        setLevel(0);
        void runTurnRef.current(final, rec.lang);
      }, 1100);
    };

    rec.onend = () => {
      isRecognizingRef.current = false;
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
    };

    recRef.current = rec;
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
      } catch {}
      window.speechSynthesis?.cancel();
    };
  }, [supported, lang]);

  // Auto-start listening when the voice panel is opened
  useEffect(() => {
    if (open && supported) {
      wantListeningRef.current = true;
      const timer = window.setTimeout(() => {
        startListeningSafe();
      }, 150);
      return () => window.clearTimeout(timer);
    } else if (!open) {
      wantListeningRef.current = false;
      try {
        recRef.current?.stop();
      } catch {}
      window.speechSynthesis?.cancel();
      setPhaseBoth("idle");
    }
  }, [open, supported, startListeningSafe]);

  // Announce verified search results when query finishes
  useEffect(() => {
    if (!open || !queryResult || queryResult.status === "running") return;
    if (spokenResultRef.current === queryResult.id) return;
    spokenResultRef.current = queryResult.id;

    const isHi = lang === "hi" || (recRef.current?.lang?.startsWith("hi") ?? false);
    let speech = "";
    if (queryResult.status !== "done" || queryResult.kept === 0) {
      speech = isHi
        ? `माफ़ कीजिए, ${queryResult.prompt} के लिए कोई सत्यापित नतीजा नहीं मिला।`
        : `Sorry, I couldn't find verified results for ${queryResult.prompt}.`;
    } else {
      const topRows = queryResult.top
        .slice(0, 3)
        .map((r) => `${r.title} at ${r.company}${r.location ? ` in ${r.location}` : ""}`)
        .join("; ");
      speech = isHi
        ? `${queryResult.prompt} के लिए ${queryResult.kept} सत्यापित नतीजे मिले। मुख्य: ${topRows}। पूरी सूची आपकी स्क्रीन पर है।`
        : `I found ${queryResult.kept} verified ${queryResult.kept > 1 ? "rows" : "row"} for ${queryResult.prompt}. Top: ${topRows}. You can explore the full list on your screen.`;
    }

    setTurns((prev) => [
      ...prev,
      { role: "agent", text: speech, lang: isHi ? "hi-IN" : "en-IN" },
    ]);
    speak(speech, isHi ? "hi-IN" : "en-IN");
  }, [queryResult, open, lang, speak]);

  const begin = () => {
    wantListeningRef.current = true;
    startListeningSafe();
  };

  const pause = () => {
    wantListeningRef.current = false;
    try {
      recRef.current?.stop();
    } catch {}
    window.speechSynthesis?.cancel();
    setPhaseBoth("idle");
  };

  const interrupt = () => {
    window.speechSynthesis?.cancel();
    wantListeningRef.current = true;
    startListeningSafe();
  };

  // Closed state: floating mic pill, always reachable.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label={t("Talk to ekam", "ekam से बात करें")}
        className="fixed bottom-5 right-5 z-40 flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-semibold shadow-lg transition hover:scale-105"
        style={{ background: "var(--accent)", color: "var(--accent-contrast)", boxShadow: "var(--shadow-2)" }}
      >
        <span aria-hidden className={phase !== "idle" ? "animate-pulse" : ""}>◉</span>
        {t("Talk to ekam", "ekam से बात करें")}
      </button>
    );
  }

  if (!supported) {
    return (
      <div className="card fixed bottom-5 right-5 z-40 max-w-xs p-4 shadow-[var(--shadow-2)]">
        <p className="text-sm">{t("Voice mode needs Chrome, Edge or another Chromium browser with microphone access.", "वॉइस मोड के लिए Chrome/Edge और माइक चाहिए।")}</p>
        <button className="btn btn-primary mt-3 text-xs" onClick={() => onOpenChange(false)}>
          {t("Back to typing", "टाइपिंग पर वापस")}
        </button>
      </div>
    );
  }

  const live = phase === "listening" || phase === "speaking";

  return (
    <section
      aria-label={t("Voice conversation with ekam", "ekam से वॉइस बातचीत")}
      className="card fixed bottom-5 right-5 z-40 w-[min(92vw,390px)] p-4 shadow-[var(--shadow-2)] backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: live ? "var(--success)" : "var(--muted)" }} />
          <strong className="mono text-sm">{t("ekam is live", "ekam लाइव है")}</strong>
        </div>
        <button
          className="btn btn-ghost min-h-[32px] text-xs"
          aria-label={t("Close voice panel", "वॉइस पैनल बंद करें")}
          onClick={() => (phase === "idle" ? onOpenChange(false) : pause())}
        >
          {t("Minimize", "छोटा करें")}
        </button>
      </div>

      {/* Live indicator: animated wave bars */}
      <div className="mt-3 flex items-center gap-3" role="status" aria-live="polite">
        <div className={`flex h-6 items-end gap-1 ${live ? "animate-pulse" : ""}`} aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-1.5 rounded-full transition-all duration-200"
              style={{
                background: live ? "var(--accent)" : "var(--muted)",
                height: live ? `${6 + ((level * (i + 2) + i * 5) % 18)}px` : "4px",
              }}
            />
          ))}
        </div>
        <p className="mono text-xs font-medium" style={{ color: live ? "var(--accent)" : "var(--muted)" }}>
          {phase === "idle" ? t("Tap Start talking", "शुरू करने के लिए दबाएं") : t(PHASE_LABEL[phase], PHASE_LABEL[phase])}
          {muted ? ` · ${t("muted", "म्यूट")}` : ""}
        </p>
      </div>

      {heard && (
        <p className="mt-2 text-sm italic" style={{ color: "var(--text)" }}>
          &ldquo;{heard}&rdquo;
        </p>
      )}

      <div className="mt-3 flex max-h-52 flex-col gap-2 overflow-y-auto rounded p-2 text-sm" style={{ background: "var(--surface)" }}>
        {turns.length === 0 ? (
          <p className="text-xs text-[var(--muted)] text-center py-4">
            {t("Say \"Namaste\", or ask: \"Show AI developer jobs in Bengaluru\"", "बोलें \"नमस्ते\", या पूछें: \"मुझे Noida में फ्लैट दिखाओ\"")}
          </p>
        ) : (
          turns.slice(-6).map((turn, i) => (
            <p
              key={i}
              className="m-0 text-xs sm:text-sm"
              style={{
                textAlign: turn.role === "user" ? "right" : "left",
                color: turn.role === "user" ? "var(--text)" : "var(--muted)",
              }}
            >
              <strong>{turn.role === "user" ? t("You", "आप") : "ekam"}:</strong> {turn.text}
            </p>
          ))
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {phase === "speaking" ? (
          <button className="btn min-h-[40px] flex-1 text-xs sm:text-sm" onClick={interrupt}>
            {t("Interrupt", "बीच में बोलें")}
          </button>
        ) : phase === "listening" ? (
          <button className="btn min-h-[40px] flex-1 text-xs sm:text-sm" onClick={pause}>
            {t("Pause", "रोकें")}
          </button>
        ) : (
          <button className="btn btn-primary min-h-[40px] flex-1 text-xs sm:text-sm" onClick={begin}>
            {t("Start talking", "बात शुरू करें")}
          </button>
        )}
        <button
          className="btn btn-ghost min-h-[40px] text-xs sm:text-sm"
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
