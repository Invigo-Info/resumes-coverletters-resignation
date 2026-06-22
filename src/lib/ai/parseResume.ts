import { DEFAULT_SECTION_ORDER, type ResumeState } from "@/lib/store/resume-store";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Shape returned by the `extractResume` AI task                      */
/* ------------------------------------------------------------------ */

/** One employment entry as returned by the AI (all fields optional/loose). */
interface AiEmployment {
  jobTitle?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bullets?: string[];
}
/** One education entry as returned by the AI (all fields optional/loose). */
interface AiEducation {
  institution?: string;
  degree?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}
/** The full loose shape the `extractResume` AI task returns before mapping. */
interface AiResume {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  location?: string;
  summary?: string;
  employment?: AiEmployment[];
  skills?: (string | { name?: string })[];
  education?: AiEducation[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

// Escape user/AI text before embedding it in the rich-text HTML body.
const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Plain text → one <p> per blank-line-separated block (single newlines kept). */
function toParagraphs(text: string): string {
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .map((b) => escapeHtml(b.trim()).replace(/\n/g, "<br/>"))
    .filter(Boolean);
  return blocks.length ? blocks.map((b) => `<p>${b}</p>`).join("") : "";
}

/** Bullet strings → a single <ul>. */
function bulletsToHtml(bullets: string[]): string {
  const items = bullets
    .map((b) => b.replace(/^[•\-*\s]+/, "").trim())
    .filter(Boolean);
  if (!items.length) return "";
  return `<ul>${items.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`;
}

/** Read a File as bare base64 (no `data:...;base64,` prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Map the AI extraction into the resume store shape. */
function mapToResume(d: AiResume): Partial<ResumeState> {
  return {
    personal: {
      firstName: d.firstName?.trim() || "",
      lastName: d.lastName?.trim() || "",
      jobTitle: d.jobTitle?.trim() || "",
      nationality: "",
      driverLicense: "",
      birthDate: "",
    },
    contact: {
      email: d.email?.trim() || "",
      phone: d.phone?.trim() || "",
      linkedin: d.linkedin?.trim() || "",
      location: d.location?.trim() || "",
    },
    summary: d.summary?.trim() ? toParagraphs(d.summary) : "",
    employment: (d.employment ?? []).map((e, i) => ({
      id: `emp-up-${i + 1}`,
      jobTitle: e.jobTitle?.trim() || "",
      company: e.company?.trim() || "",
      startDate: e.startDate?.trim() || "",
      endDate: e.endDate?.trim() || "",
      location: e.location?.trim() || "",
      description: bulletsToHtml(e.bullets ?? []),
    })),
    skills: (d.skills ?? [])
      .map((s) => (typeof s === "string" ? s : s?.name ?? ""))
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, i) => ({ id: `sk-up-${i + 1}`, name, level: "" })),
    education: (d.education ?? []).map((e, i) => ({
      id: `edu-up-${i + 1}`,
      institution: e.institution?.trim() || "",
      degree: e.degree?.trim() || "",
      startDate: e.startDate?.trim() || "",
      endDate: e.endDate?.trim() || "",
      location: e.location?.trim() || "",
      description: e.description?.trim() ? toParagraphs(e.description) : "",
    })),
    additional: [],
    sectionOrder: DEFAULT_SECTION_ORDER,
    activeSection: "personal",
  };
}

/** True when the AI returned something usable (at least a name or one job). */
function isUsable(d: Partial<ResumeState>): boolean {
  return Boolean(
    d.personal?.firstName ||
      d.personal?.lastName ||
      (d.employment && d.employment.length > 0)
  );
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Parse an uploaded resume into the builder's data shape.
 *
 * With a GEMINI_API_KEY configured, the file (PDF/DOC) is sent to the model
 * and the candidate's REAL details are extracted. Without a key — or if the
 * call fails, or no file is provided (cloud-import demo buttons) — it falls
 * back to canned sample content so the flow always completes.
 */
export async function parseResume(file?: File): Promise<Partial<ResumeState>> {
  // Real file → extract the candidate's actual data. We deliberately DO NOT
  // fall back to sample data here: showing a different person's resume for the
  // user's upload is worse than a clear error. Throw so the caller can retry.
  if (file) {
    const base64 = await fileToBase64(file);
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "extractResume",
        payload: {
          file: { mimeType: file.type || "application/pdf", data: base64 },
        },
      }),
    });
    if (!res.ok) throw new Error(`parse-failed-${res.status}`);
    const json = await res.json();
    if (json.fallback) throw new Error("parse-unavailable"); // no API key on server
    if (!json.data) throw new Error("parse-empty");
    const mapped = mapToResume(json.data as AiResume);
    if (!isUsable(mapped)) throw new Error("parse-unreadable");
    return mapped;
  }

  // No file (cloud-import demo buttons) → canned sample so the flow completes.
  await delay(1200);
  return MOCK_RESUME;
}

/* ------------------------------ fallback ----------------------------- */

/** Canned sample resume used when no real file is parsed (cloud-import demo). */
const MOCK_RESUME: Partial<ResumeState> = {
  personal: {
    firstName: "Sophia",
    lastName: "Carter",
    jobTitle: "Senior Marketing Manager",
    nationality: "",
    driverLicense: "",
    birthDate: "",
  },
  contact: {
    email: "sophia.carter@example.com",
    phone: "+1 415 555 0199",
    linkedin: "linkedin.com/in/sophiacarter",
    location: "San Francisco, CA",
  },
  summary:
    "<p>Senior Marketing Manager with 8+ years of experience leading integrated campaigns across digital and brand. Proven record of growing pipeline and engagement through data-driven strategy, strong cross-functional leadership, and a sharp eye for storytelling.</p>",
  employment: [
    {
      id: "emp-u1",
      jobTitle: "Senior Marketing Manager",
      company: "Apple",
      startDate: "Mar 2021",
      endDate: "Present",
      location: "Cupertino, CA",
      description:
        "<ul><li>Led integrated go-to-market campaigns that grew qualified pipeline by 32% year over year.</li><li>Managed a team of 6 marketers and a $2M annual budget across paid, content, and lifecycle.</li><li>Built an experimentation program that lifted email conversion by 18%.</li></ul>",
    },
    {
      id: "emp-u2",
      jobTitle: "Marketing Specialist",
      company: "Meta",
      startDate: "Jun 2017",
      endDate: "Feb 2021",
      location: "Menlo Park, CA",
      description:
        "<ul><li>Owned content strategy and SEO, doubling organic traffic over two years.</li><li>Partnered with product and sales to launch three flagship features.</li></ul>",
    },
  ],
  skills: [
    { id: "sk-u1", name: "Market Research", level: "Expert" },
    { id: "sk-u2", name: "SEO", level: "Experienced" },
    { id: "sk-u3", name: "Content Strategy", level: "Expert" },
    { id: "sk-u4", name: "Brand Management", level: "Experienced" },
    { id: "sk-u5", name: "Google Analytics", level: "Skillful" },
  ],
  education: [
    {
      id: "edu-u1",
      institution: "Stanford University",
      degree: "Bachelor of Arts in Marketing",
      startDate: "Sep 2013",
      endDate: "Jun 2017",
      location: "Stanford, CA",
      description: "",
    },
  ],
  additional: [],
  sectionOrder: DEFAULT_SECTION_ORDER,
  activeSection: "personal",
};
