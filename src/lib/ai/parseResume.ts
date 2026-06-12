import { DEFAULT_SECTION_ORDER, type ResumeState } from "@/lib/store/resume-store";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Mock resume parser. Returns a canned, fully-filled resume after a short delay
 * so the upload flow behaves like the real product without any API key.
 *
 * Phase 12 (optional) would swap this for a real model call + file extraction —
 * keep this the only boundary so the UI never changes.
 */
export async function parseResume(/* file?: File */): Promise<Partial<ResumeState>> {
  await delay(1400);

  return {
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
}
