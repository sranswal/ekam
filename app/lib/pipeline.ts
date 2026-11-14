export type Interpreted = NonNullable<
  import("@/db/schema").Query["interpreted"]
>;

const HINGLISH_HINTS: Array<[RegExp, string]> = [
  [/\b(naukri|job|jobs|vacancy|hiring|internship)\b/i, "job"],
  [/\bdeveloper|engineer|programmer\b/i, "developer"],
  [/\bbangalore|bengaluru\b/i, "Bengaluru"],
  [/\bdelhi|ncr|gurgaon|gurugram|noida\b/i, "Delhi NCR"],
  [/\bmumbai\b/i, "Mumbai"],
  [/\bpune\b/i, "Pune"],
  [/\bhyderabad\b/i, "Hyderabad"],
  [/\b(chennai)\b/i, "Chennai"],
];

const VERTICAL_HINTS: Array<[RegExp, string]> = [
  [
    /\b(flat|flats|apartment|house|home|ghar|makaan|plot|rent|kiraya|kiraaya|buy|sale|property|real estate|2bhk|3bhk|bhk|room|pg)\b/i,
    "properties",
  ],
  [/\b(tender|tenders|निविदा|rfp|contract)\b/i, "tenders"],
  [/\b(event|events|concert|मेला|workshop|meetup|conference)\b/i, "events"],
  [/\b(naukri|job|jobs|vacancy|hiring|internship|नौकरी)\b/i, "jobs"],
];

export function detectVertical(prompt: string): string {
  for (const [re, vertical] of VERTICAL_HINTS) {
    if (re.test(prompt)) return vertical;
  }
  return "jobs";
}

export function detectLanguage(prompt: string): string {
  if (/[\u0900-\u097F]/.test(prompt)) return "hi";
  if (/\b(kya|hai|chahiye|mujhe|dijiye|batao|naukri|milegi)\b/i.test(prompt)) return "hinglish";
  return "en";
}

export function fallbackInterpret(prompt: string): Interpreted {
  const lower = prompt.toLowerCase();
  let location = "Remote";
  const CITY_PATTERNS: Array<[RegExp, string]> = [
    [/\b(bangalore|bengaluru)\b/i, "Bengaluru"],
    [/\b(delhi|ncr|gurgaon|gurugram|noida|greater noida|faridabad|ghaziabad)\b/i, "Delhi NCR"],
    [/\bmumbai\b|\bमुंबई\b/i, "Mumbai"],
    [/\bpune\b|\bपुणे\b/i, "Pune"],
    [/\bhyderabad\b/i, "Hyderabad"],
    [/\bchennai\b/i, "Chennai"],
    [/\bkolkata\b/i, "Kolkata"],
  ];
  for (const [re, city] of CITY_PATTERNS) {
    if (re.test(prompt)) {
      location = city;
      break;
    }
  }
  // A specific location mentioned in the prompt wins verbatim (e.g. "Maidaan", a locality).
  // Anchored on "<place> mein/in <thing>" so we capture the place, not the thing.
  const devanagariCity = /(?:^|\s)([\u0900-\u097Fa-zA-Z][\u0900-\u097Fa-zA-Z]{2,20}(?:\s[\u0900-\u097Fa-zA-Z][\u0900-\u097Fa-zA-Z]{1,20})?)\s+(?:में|mein|me|in)\s+(?:flat|flats|job|jobs|नौकरी|ghar|मकान|plot|property|apartment)/i.exec(prompt);
  if (location === "Remote" && devanagariCity) {
    // Drop leading filler words ("mujhe Maidaan" -> "Maidaan")
    const filler = /^(mujhe|mujh|hai|kya|please|wo|vah|ek)\s+/i;
    const candidate = devanagariCity[1].trim().replace(filler, "");
    const knownCity = CITY_PATTERNS.some(([re]) => re.test(candidate));
    if (candidate && !knownCity && !filler.test(candidate)) location = candidate;
  }
  let role = "developer";
  if (/data (scien|analyst|engineer)/.test(lower)) role = "data";
  else if (/\b(frontend|front-end|react|next)\b/.test(lower)) role = "frontend";
  else if (/\b(backend|back-end|node|python|go)\b/.test(lower)) role = "backend";
  else if (/\b(ai|ml|machine learning)\b/.test(lower)) role = "ai";
  const vertical = detectVertical(prompt);
  const keywords =
    vertical === "jobs"
      ? [role, ...HINGLISH_HINTS.filter(([re]) => re.test(lower)).map(([, k]) => k)].filter(
          (k, i, a) => a.indexOf(k) === i && k !== "job",
        )
      : vertical === "properties"
        ? [/\b(rent|kiraya|kiraaya|किराया)\b/i.test(lower) ? "flats for rent" : "flats for sale", location]
        : [vertical, location];
  const lang = detectLanguage(prompt);
  const recencyMatch = /\b(\d+)\s*(day|din|roza)\b|\bthis week\b|\bhafter\b|\bहफ़्ते\b|\bइस हफ्ते\b/i.exec(lower);
  const topic =
    vertical === "jobs"
      ? `${role} jobs in ${location}`
      : `${keywords[0]} in ${location}`;
  const translated =
    vertical === "jobs"
      ? `${role} jobs in ${location}`
      : `${keywords[0]} in ${location}`;
  return {
    topic,
    vertical,
    role: vertical === "jobs" ? role : vertical,
    location,
    keywords: keywords.length ? keywords : ["software"],
    recencyDays:
      recencyMatch && !/\b\d+\s*(day|din)\b/i.test(recencyMatch[0])
        ? 7
        : recencyMatch
          ? Number(recencyMatch[1])
          : null,
    originalLanguage: lang,
    translatedPrompt:
      lang === "en" ? null : `${translated} (interpreted from: "${prompt.slice(0, 80)}")`,
    hindiTranslation: lang === "hi" ? null : translated,
    source: "fallback",
  };
}

export const MAX_RESULTS = 10;

export function geminiKeys(): string[] {
  return (process.env.GEMINI_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

async function callGemini(model: string, key: string, prompt: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    'Interpret this data request into JSON with keys topic (short english label), vertical (one of: jobs, properties, tenders, events, general — what kind of real-world opportunity is asked for), role (one lowercase word like ai/frontend/backend/data/developer/flat/tender/event), location (city or "Remote"), keywords (array of english search keywords), recencyDays (number or null, from phrases like "this week"), originalLanguage (en/hi/hinglish), translatedPrompt (english translation, null if already english), hindiTranslation (the request rewritten in Hindi Devanagari, null if already Hindi). Reply with ONLY the JSON. Request: ' +
                    prompt,
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(25000),
      },
    );
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as Interpreted;
    if (!parsed.keywords?.length) throw new Error("empty keywords");
    if (!parsed.vertical) parsed.vertical = "jobs";
    return parsed;
}

// gemini-2.0-flash was retired (404); flash-latest aliases the current stable model.
const GEMINI_MODELS = ["gemini-flash-latest", "gemini-2.5-flash"];

export async function interpretPrompt(prompt: string): Promise<Interpreted> {
  const keys = geminiKeys();
  for (const key of keys) {
    for (const model of GEMINI_MODELS) {
    try {
      const parsed = await callGemini(
        model,
        key,
        'Interpret this data request into JSON with keys topic (short english label), vertical (one of: jobs, properties, tenders, events, general — what kind of real-world opportunity is asked for), role (one lowercase word like ai/frontend/backend/data/developer/flat/tender/event), location (city or "Remote"), keywords (array of english search keywords), recencyDays (number or null, from phrases like "this week"), originalLanguage (en/hi/hinglish), translatedPrompt (english translation, null if already english), hindiTranslation (the request rewritten in Hindi Devanagari, null if already Hindi). Reply with ONLY the JSON. Request: ' +
          prompt,
      );
      return { ...parsed, source: "gemini" };
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(JSON.stringify({ event: "gemini_key_failed", model, error: String(err) }));
        }
      }
    }
  }
  const interpreted = fallbackInterpret(prompt);
  return {
    ...interpreted,
    translatedPrompt: interpreted.originalLanguage === "en" ? null : interpreted.translatedPrompt,
    hindiTranslation:
      interpreted.originalLanguage === "en" ? `${interpreted.topic} की नौकरियां` : null,
  };
}

export type RemoteJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  job_type: string;
  candidate_required_location: string;
  salary_min: string | null;
  salary_max: string | null;
  publication_date: string;
  tags: string[] | string | null;
};

export type SerpResult = {
  title: string;
  url: string;
  snippet: string;
  sourceName: string;
  price: string | null;
};

const INR_RE =
  /₹\s?[\d][\d,.]*\s?(k|K|lakh|L|crore|Cr|crores)?(?:\s?[–-]\s?₹?\s?[\d][\d,.]*\s?(k|K|lakh|L|crore|Cr|crores)?)?/;

function domainName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

function dedupeResults<T extends { url: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

export async function collectFromSerp(
  keywords: string[],
  location: string,
): Promise<SerpResult[]> {
  const key = process.env.SERPAPI_API_KEY;
  if (!key || !keywords.length) return [];
  const q = `${keywords.join(" ")} ${location === "Remote" ? "India" : location}`.trim();
  const url =
    `https://serpapi.com/search.json?engine=duckduckgo&api_key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`serpapi ${res.status}`);
  const data = (await res.json()) as {
    organic_results?: Array<{ title?: string; link?: string; snippet?: string }>;
  };
  return dedupeResults(
    (data.organic_results ?? [])
      .filter((r) => r.title && r.link)
      .map((r) => ({
        title: r.title!.slice(0, 200),
        url: r.link!,
        snippet: (r.snippet ?? "").slice(0, 300),
        sourceName: domainName(r.link!),
        price: INR_RE.exec(r.snippet ?? "")?.[0]?.trim() ?? null,
      })),
  ).slice(0, MAX_RESULTS);
}

const LOCATION_ALIASES: Record<string, RegExp> = {
  "delhi ncr": /\b(delhi|ncr|gurgaon|gurugram|noida|greater noida|faridabad|ghaziabad)\b/i,
};

/**
 * Keep only rows relevant to the requested location. A specific city must not be
 * answered with "Remote / worldwide" rows. Returns the kept rows and how many were
 * dropped so the validate stage can report it.
 */
export function filterByLocation<T extends { candidate_required_location: string }>(
  jobs: T[],
  location: string,
): { kept: T[]; dropped: number } {
  if (!location || location === "Remote") return { kept: jobs, dropped: 0 };
  const re = LOCATION_ALIASES[location.toLowerCase()] ?? new RegExp(`\\b${escapeRe(location)}\\b`, "i");
  let dropped = 0;
  const kept = jobs.filter((j) => {
    if (re.test(j.candidate_required_location)) return true;
    dropped += 1;
    return false;
  });
  return { kept, dropped };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function dedupeJobs<T extends { id: number }>(jobs: T[]): T[] {
  const seen = new Set<number>();
  return jobs.filter((job) => {
    if (seen.has(job.id)) return false;
    seen.add(job.id);
    return true;
  });
}

export async function collectFromRemotive(
  keywords: string[],
): Promise<RemoteJob[]> {
  const keyword = keywords[0];
  if (!keyword) return [];
  const res = await fetch(
    `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(keyword)}&limit=${MAX_RESULTS}`,
    { signal: AbortSignal.timeout(15000) },
  );
  if (!res.ok) throw new Error(`remotive ${res.status}`);
  const data = (await res.json()) as { jobs?: RemoteJob[] };
  return dedupeJobs(data.jobs ?? []).slice(0, MAX_RESULTS);
}
