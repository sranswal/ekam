import type { PersonaId } from "@/lib/brand";

export type PersonaField = {
  key: string;
  labelEn: string;
  labelHi: string;
  placeholderEn: string;
  placeholderHi: string;
  textarea?: boolean;
};

// Each persona gets its own profile form. Everything lives in profiles.data (jsonb),
// keyed by these field keys; resume stays in the dedicated columns.
export const PERSONA_FIELDS: Record<PersonaId, PersonaField[]> = {
  jobseeker: [
    { key: "headline", labelEn: "Headline", labelHi: "हेडलाइन", placeholderEn: "Backend developer, 3 years, Node + Postgres", placeholderHi: "बैकएंड डेवलपर, 3 साल, Node + Postgres" },
    { key: "skills", labelEn: "Skills (comma separated)", labelHi: "कौशल (कॉमा से अलग)", placeholderEn: "node, react, sql", placeholderHi: "node, react, sql" },
    { key: "preferredCity", labelEn: "Preferred city", labelHi: "पसंदीदा शहर", placeholderEn: "Noida", placeholderHi: "नोएडा" },
    { key: "experience", labelEn: "Experience", labelHi: "अनुभव", placeholderEn: "3 years at a fintech startup", placeholderHi: "फिनटेक स्टार्टअप में 3 साल", textarea: true },
    { key: "expectations", labelEn: "What are you looking for?", labelHi: "आप क्या ढूंढ रहे हैं?", placeholderEn: "Remote backend roles, 12+ LPA, product companies", placeholderHi: "रिमोट बैकएंड भूमिकाएं, 12+ LPA, प्रोडक्ट कंपनियां", textarea: true },
  ],
  student: [
    { key: "education", labelEn: "Course & institution", labelHi: "कोर्स और संस्थान", placeholderEn: "B.Tech CSE, 3rd year, NSUT Delhi", placeholderHi: "B.Tech CSE, तीसरा वर्ष, NSUT दिल्ली" },
    { key: "lookingFor", labelEn: "Looking for", labelHi: "क्या चाहिए", placeholderEn: "Summer internship (May–July 2027)", placeholderHi: "ग्रीष्म इंटर्नशिप (मई–जुलाई 2027)" },
    { key: "skills", labelEn: "Skills & coursework", labelHi: "कौशल और कोर्सवर्क", placeholderEn: "python, dsa, dbms, react", placeholderHi: "python, dsa, dbms, react" },
    { key: "preferredCity", labelEn: "Preferred city", labelHi: "पसंदीदा शहर", placeholderEn: "Delhi / remote", placeholderHi: "दिल्ली / रिमोट" },
    { key: "goals", labelEn: "Career goal (optional)", labelHi: "करियर लक्ष्य (वैकल्पिक)", placeholderEn: "Preplacement at a product company, or PSU via GATE", placeholderHi: "प्रोडक्ट कंपनी में प्री-प्लेसमेंट, या GATE से PSU", textarea: true },
  ],
  sme: [
    { key: "businessName", labelEn: "Business name", labelHi: "व्यापार का नाम", placeholderEn: "Sharma Textiles Pvt Ltd", placeholderHi: "शर्मा टेक्सटाइल्स प्रा लि" },
    { key: "industry", labelEn: "Industry", labelHi: "उद्योग", placeholderEn: "Garment manufacturing", placeholderHi: "गारमेंट निर्माण" },
    { key: "city", labelEn: "City of operation", labelHi: "कार्य का शहर", placeholderEn: "Surat, Gujarat", placeholderHi: "सूरत, गुजरात" },
    { key: "needs", labelEn: "What should ekam find for you?", labelHi: "ekam आपके लिए क्या ढूंढे?", placeholderEn: "Government tenders for uniform supply, warehouse property on rent", placeholderHi: "वर्दी आपूर्ति के सरकारी टेंडर, किराए पर गोदाम", textarea: true },
    { key: "size", labelEn: "Business size", labelHi: "व्यापार का आकार", placeholderEn: "45 staff, ₹4 Cr annual turnover", placeholderHi: "45 कर्मचारी, ₹4 करोड़ वार्षिक टर्नओवर" },
  ],
  agency: [
    { key: "agencyType", labelEn: "Type of agency", labelHi: "एजेंसी का प्रकार", placeholderEn: "Recruitment / talent sourcing", placeholderHi: "रिक्रूटमेंट / टैलेंट सोर्सिंग" },
    { key: "services", labelEn: "Daily work & services", labelHi: "रोज़ का काम और सेवाएं", placeholderEn: "Bulk hiring drives for retail chains, volume CV sourcing", placeholderHi: "रिटेल चेन के लिए बल्क हायरिंग, वॉल्यूम CV सोर्सिंग", textarea: true },
    { key: "clients", labelEn: "Client industries", labelHi: "ग्राहक उद्योग", placeholderEn: "Retail, logistics, BPO", placeholderHi: "रिटेल, लॉजिस्टिक्स, BPO" },
    { key: "city", labelEn: "Operating cities", labelHi: "कार्यशील शहर", placeholderEn: "Mumbai, Pune, Nashik", placeholderHi: "मुंबई, पुणे, नाशिक" },
    { key: "dataNeeds", labelEn: "Data ekam should deliver", labelHi: "ekam से कौन सा डेटा चाहिए", placeholderEn: "Verified candidate-facing job listings with salary, exported nightly", placeholderHi: "वेतन सहित सत्यापित नौकरी लिस्टिंग, रात्रि निर्यात", textarea: true },
  ],
};

export const RESUME_PERSONAS: PersonaId[] = ["jobseeker", "student"];

export function sanitizePersonaData(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>).slice(0, 30)) {
    if (!/^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(key)) continue;
    if (typeof value !== "string") continue;
    const clean = value.slice(0, 1000);
    if (clean) out[key] = clean;
  }
  return out;
}
