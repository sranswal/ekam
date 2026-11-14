export const BRAND = {
  name: "ekam",
  tagline: "all in one",
  description:
    "ekam turns a plain-language question — in English or Hindi — into a verified, source-linked dataset: jobs, properties, tenders, events and more.",
  repo: "https://github.com/sranswal/ekam",
} as const;

export const PERSONAS = [
  { id: "jobseeker", label: "Job seeker", hi: "नौकरी की तलाश", blurb: "Find verified roles that match your skills and city." },
  { id: "student", label: "Student", hi: "छात्र", blurb: "Internships, first jobs and skill pathways." },
  { id: "sme", label: "SME / founder", hi: "व्यापारी", blurb: "Tenders, suppliers, properties and hiring." },
  { id: "agency", label: "Agency", hi: "एजेंसी", blurb: "Bulk sourcing and clean datasets for clients." },
] as const;

export type PersonaId = (typeof PERSONAS)[number]["id"];
