"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type VoiceTurn = { role: "user" | "agent"; text: string; lang: string | null };

type ResultsPayload = {
  prompt: string;
  status: string;
  collected: number;
  kept: number;
  duplicates: number;
  flagged: number;
  error: string | null;
  top: Array<{ title: string; company: string; location: string | null }>;
};

type Phase = "idle" | "listening" | "thinking" | "searching" | "speaking";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
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

export default function VoiceSession({ onClose }: { onClose: () => void }) {
  const [supported, setSupported] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const mutedRef = useRef(false);
  const turnsRef = useRef<VoiceTurn[]>([]);
  const wantListeningRef = useRef(false);
  const finalizeRef = useRef<number | null>(null);

  useEffect(() => {
    setSupported(pickRecognitionCtor() !== null);
  }, []);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const speak = useCallback((text: string, lang: string) => {
    if (mutedRef.current || typeof window === "undefined" || !window.speechSynthesis) {
      setPhaseBoth("listening");
      startListeningSafe();
      return;
    }
    setPhaseBoth("speaking");
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    utter.rate = 1.05;
    utter.onend = () => {
      setPhaseBoth("listening");
      startListeningSafe();
    };
    utter.onerror = () => {
      setPhaseBoth("listening");
      startListeningSafe();
    };
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
    async (userText: string, lang: string, pendingResults?: ResultsPayload) => {
      wantListeningRef.current = false;
      recRef.current?.stop();
      setPhaseBoth("thinking");
      setError(null);
      const history = turnsRef.current;
      try {
        const res = await fetch("/api/voice/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history, userText, pendingResults: pendingResults ?? null }),
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
          const next = [...prev, { role: "user" as const, text: userText, lang }, { role: "agent" as const, text: reply.reply, lang: reply.replyHindi ? "hi-IN" : lang }];
          turnsRef.current = next.slice(-24);
          return next;
        });

        if (reply.action?.type === "run_query") {
          setPhaseBoth("searching");
          const qRes = await fetch("/api/queries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: reply.action.prompt }),
          });
          if (!qRes.ok) {
            const qData = (await qRes.json().catch(() => ({}))) as { error?: string };
            throw new Error(qData.error ?? `pipeline ${qRes.status}`);
          }
          const qData = (await qRes.json()) as { id: number };
          const dRes = await fetch(`/api/queries/${qData.id}`, { cache: "no-store" });
          if (!dRes.ok) throw new Error(`query ${dRes.status}`);
          const detail = (await dRes.json()) as {
            query: { prompt: string; status: string; collected: number; kept: number; duplicates: number; flagged: number; error: string | null };
            listings: Array<{ title: string; company: string; location: string | null }>;
          };
          const results: ResultsPayload = {
            prompt: detail.query.prompt,
            status: detail.query.status,
            collected: detail.query.collected,
            kept: detail.query.kept,
            duplicates: detail.query.duplicates,
            flagged: detail.query.flagged,
            error: detail.query.error,
            top: detail.listings.slice(0, 3),
          };
          // Second brain call: speak the verified results like a person.
          const speakRes = await fetch("/api/voice/turn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              history: turnsRef.current,
              userText: "(pipeline finished, report the result)",
              pendingResults: results,
            }),
          });
          if (speakRes.ok) {
            const spoken = (await speakRes.json()) as { reply: string; replyHindi: string | null };
            setTurns((prev) => {
              const next = [...prev, { role: "agent" as const, text: spoken.reply, lang: spoken.replyHindi ? "hi-IN" : lang }];
              turnsRef.current = next.slice(-24);
              return next;
            });
            wantListeningRef.current = true;
            speak(spoken.replyHindi && lang.startsWith("hi") ? spoken.replyHindi : spoken.reply, spoken.replyHindi && lang.startsWith("hi") ? "hi-IN" : lang);
            return;
          }
          wantListeningRef.current = true;
          speak(`Done. ${results.kept} verified rows for ${results.prompt}.`, lang);
          return;
        }

        wantListeningRef.current = true;
        const replyLang = reply.replyHindi && lang.startsWith("hi") ? "hi-IN" : lang;
        speak(reply.replyHindi && lang.startsWith("hi") ? reply.replyHindi : reply.reply, replyLang);
      } catch (err) {
        const message = err instanceof Error ? err.message : "voice turn failed";
        setError(message);
        wantListeningRef.current = true;
        speak("Sorry, kuch galat ho gaya. Dobara boliye.", "hi-IN");
      }
    },
    [speak],
  );

  useEffect(() => {
    if (!supported) return;
    const Ctor = pickRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        finalText += event.results[i][0].transcript;
      }
      setHeard(finalText);
      // Restart a quiet timer: 1.2s after the last result, finalize the turn.
      if (finalizeRef.current) window.clearTimeout(finalizeRef.current);
      const text = finalText.trim();
      if (!text) return;
      finalizeRef.current = window.setTimeout(() => {
        setHeard("");
        void runTurn(text, rec.lang);
      }, 1200);
    };
    rec.onend = () => {
      if (wantListeningRef.current && phaseRef.current !== "speaking" && phaseRef.current !== "thinking" && phaseRef.current !== "searching") {
        try {
          rec.start();
        } catch {
          // ignore
        }
      }
    };
    rec.onerror = (event) => {
      if (event.error === "not-allowed") {
        setError("Microphone permission denied. Allow the mic and try again.");
        wantListeningRef.current = false;
      }
    };
    recRef.current = rec;
    return () => {
      wantListeningRef.current = false;
      if (finalizeRef.current) window.clearTimeout(finalizeRef.current);
      try {
        rec.stop();
      } catch {
        // ignore
      }
      window.speechSynthesis?.cancel();
    };
  }, [supported, runTurn]);

  const begin = () => {
    wantListeningRef.current = true;
    setPhaseBoth("listening");
    startListeningSafe();
  };

  const interrupt = () => {
    // Barge-in: stop speaking, resume listening.
    window.speechSynthesis?.cancel();
    wantListeningRef.current = true;
    setPhaseBoth("listening");
    startListeningSafe();
  };

  const end = () => {
    wantListeningRef.current = false;
    window.speechSynthesis?.cancel();
    recRef.current?.stop();
    setPhaseBoth("idle");
    onClose();
  };

  if (!supported) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <p>Voice mode needs Chrome, Edge or another Chromium browser with microphone access.</p>
        <button className="btn" onClick={onClose}>
          Back to typing
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Voice conversation" className="card" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <strong>ekam voice</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => { mutedRef.current = !mutedRef.current; setMuted(mutedRef.current); }}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button className="btn btn-ghost" onClick={end}>
            End
          </button>
        </div>
      </div>

      <p className="mono text-xs" style={{ color: "var(--muted)" }} role="status">
        {phase === "idle" && "Tap the mic and just talk."}
        {phase === "listening" && "Listening…"}
        {phase === "thinking" && "Thinking…"}
        {phase === "searching" && "Searching verified sources…"}
        {phase === "speaking" && "Speaking… (tap to interrupt)"}
      </p>

      {heard && (
        <p style={{ fontStyle: "italic" }}>&ldquo;{heard}&rdquo;</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
        {turns.map((t, i) => (
          <p
            key={i}
            style={{
              textAlign: t.role === "user" ? "right" : "left",
              margin: 0,
              color: t.role === "user" ? "var(--fg)" : "var(--muted)",
            }}
          >
            <strong>{t.role === "user" ? "You" : "ekam"}:</strong> {t.text}
          </p>
        ))}
      </div>

      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {phase === "speaking" ? (
          <button className="btn" onClick={interrupt} style={{ minWidth: 140 }}>
            Interrupt
          </button>
        ) : phase === "listening" ? (
          <button className="btn" onClick={() => { wantListeningRef.current = false; recRef.current?.stop(); setPhaseBoth("idle"); }} style={{ minWidth: 140 }}>
            Pause
          </button>
        ) : (
          <button className="btn" onClick={begin} style={{ minWidth: 140 }}>
            {phase === "idle" ? "Start talking" : "Wait…"}
          </button>
        )}
      </div>
    </section>
  );
}
