import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  agentTurn,
  fallbackResultsSummary,
  fallbackTurn,
  trimHistory,
  type AgentContext,
} from "./voice-agent";

function ctx(over: Partial<AgentContext> = {}): AgentContext {
  return {
    history: [],
    userText: "hello",
    userName: "Aarav",
    persona: "jobseeker",
    ...over,
  };
}

describe("trimHistory", () => {
  it("keeps the last 12 non-empty turns", () => {
    const turns = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 ? ("agent" as const) : ("user" as const),
      text: `t${i}`,
      lang: null,
    }));
    const trimmed = trimHistory(turns);
    assert.equal(trimmed.length, 12);
    assert.equal(trimmed[0].text, "t18");
    assert.equal(trimmed[11].text, "t29");
  });

  it("drops blank and malformed turns", () => {
    const trimmed = trimHistory([
      { role: "user", text: "  ", lang: null },
      null as unknown as { role: "user"; text: string; lang: null },
      { role: "agent", text: "hi", lang: null },
    ]);
    assert.equal(trimmed.length, 1);
    assert.equal(trimmed[0].text, "hi");
  });
});

describe("fallbackTurn (no Gemini key)", () => {
  it("greets conversationally without a search action", () => {
    const out = fallbackTurn(ctx({ userText: "namaste" }));
    assert.equal(out.action, null);
    assert.match(out.reply, /Namaste Aarav/);
    // English-language greeting: spoken reply is the Hinglish one, no Devanagari twin.
    assert.equal(out.replyHindi, null);
  });

  it("answers who-are-you without searching", () => {
    const out = fallbackTurn(ctx({ userText: "who are you?" }));
    assert.equal(out.action, null);
    assert.match(out.reply, /I'm ekam/);
  });

  it("runs a search for a job ask", () => {
    const out = fallbackTurn(ctx({ userText: "AI developer jobs in Bengaluru" }));
    assert.equal(out.action?.type, "run_query");
    assert.equal(out.action?.prompt, "AI developer jobs in Bengaluru");
  });

  it("runs a search for a Hinglish property ask", () => {
    const out = fallbackTurn(ctx({ userText: "mujhe Noida mein flat dikhao" }));
    assert.equal(out.action?.type, "run_query");
    assert.equal(out.action?.prompt, "mujhe Noida mein flat dikhao");
  });

  it("runs a search for a Devanagari tender ask", () => {
    const out = fallbackTurn(ctx({ userText: "दिल्ली में निविदा दिखाओ" }));
    assert.equal(out.action?.type, "run_query");
  });

  it("offers help for plain chatter without search keywords", () => {
    const out = fallbackTurn(ctx({ userText: "hmm interesting" }));
    assert.equal(out.action, null);
    assert.match(out.reply, /ekam/);
  });

  it("never throws for oversized input (clamped upstream)", () => {
    const out = fallbackTurn(ctx({ userText: "x".repeat(600) }));
    assert.ok(out.reply.length > 0);
  });
});

describe("fallbackResultsSummary", () => {
  const base = {
    prompt: "AI developer jobs in Bengaluru",
    status: "done",
    collected: 12,
    duplicates: 3,
    flagged: 1,
    error: null,
  };

  it("speaks the count and top rows", () => {
    const out = fallbackResultsSummary({
      ...base,
      kept: 5,
      top: [
        { title: "AI Engineer", company: "Acme", location: "Bengaluru" },
        { title: "ML Dev", company: "Beta", location: null },
      ],
    });
    assert.match(out.reply, /5 verified rows/);
    assert.match(out.reply, /AI Engineer at Acme in Bengaluru/);
    assert.match(out.reply, /3 duplicates/);
    assert.match(out.replyHindi ?? "", /सत्यापित/);
  });

  it("handles zero verified rows honestly", () => {
    const out = fallbackResultsSummary({ ...base, kept: 0, top: [] });
    assert.match(out.reply, /couldn't find verified rows/);
  });
});

describe("agentTurn", () => {
  it("falls back to the deterministic brain when no key is available", async () => {
    const prev = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const out = await agentTurn(ctx({ userText: "mujhe Noida mein flat dikhao" }));
      assert.equal(out.source, "fallback");
      assert.equal(out.action?.type, "run_query");
      assert.equal(out.action?.prompt, "mujhe Noida mein flat dikhao");
    } finally {
      if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
    }
  });
});
