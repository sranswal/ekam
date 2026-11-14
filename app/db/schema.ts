import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  persona: text("persona"), // jobseeker | student | sme | agency
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const profiles = pgTable(
  "profiles",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    headline: text("headline"),
    skills: text("skills"),
    preferredCity: text("preferred_city"),
    resumeText: text("resume_text"),
    resumeFileName: text("resume_file_name"),
    data: jsonb("data").$type<Record<string, string>>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const queries = pgTable("queries", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  interpreted: jsonb("interpreted").$type<{
    topic: string;
    vertical: string;
    role: string;
    location: string;
    keywords: string[];
    recencyDays: number | null;
    originalLanguage: string;
    translatedPrompt: string | null;
    hindiTranslation: string | null;
    source: "gemini" | "fallback";
  }>(),
  status: text("status").notNull().default("running"),
  collected: integer("collected").notNull().default(0),
  kept: integer("kept").notNull().default(0),
  duplicates: integer("duplicates").notNull().default(0),
  flagged: integer("flagged").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const listings = pgTable(
  "listings",
  {
    id: serial("id").primaryKey(),
    queryId: integer("query_id")
      .notNull()
      .references(() => queries.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    company: text("company").notNull(),
    location: text("location"),
    category: text("category"),
    jobType: text("job_type"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    publicationDate: text("publication_date"),
    tags: text("tags").array().notNull().default([]),
    sourceUrl: text("source_url").notNull(),
    sourceName: text("source_name").notNull().default("Remotive"),
    dedupeKey: text("dedupe_key").notNull(),
    incomplete: boolean("incomplete").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("listings_query_idx").on(t.queryId)],
);

export const pipelineEvents = pgTable(
  "pipeline_events",
  {
    id: serial("id").primaryKey(),
    queryId: integer("query_id")
      .notNull()
      .references(() => queries.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(), // interpret | plan | collect | validate | done
    status: text("status").notNull(), // running | ok | error
    detail: text("detail"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    durationMs: integer("duration_ms"),
  },
  (t) => [index("events_query_idx").on(t.queryId)],
);

export type Query = typeof queries.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type PipelineEvent = typeof pipelineEvents.$inferSelect;
