/** Static chip data for the resignation-letter builder (from the screenshots). */

/** Reason chips — single-select, no emoji (Step 5.png). */
export const RL_REASONS = [
  "Personal Reasons",
  "Relocation",
  "Career Advancement",
  "Health Reasons",
  "Change in Career Path",
  "Work-Life Balance",
  "Other Reason",
];

export const RL_OTHER_REASON = "Other Reason";

/**
 * A ready-to-edit reason paragraph for each chip, interpolating the company
 * name. Selecting a reason seeds the editable box with the matching paragraph;
 * the user can then refine it manually or with "Improve with AI".
 */
export function reasonParagraph(
  reason: string | null,
  otherText: string,
  companyName: string
): string {
  const company = companyName.trim() || "this company";
  switch (reason) {
    case "Career Advancement":
      return `Having thoroughly reflected on my professional journey, I have decided to pursue new avenues that align more closely with my aspirations for career advancement. This decision is motivated by a desire to embrace new challenges and expand my skill set, which I believe will further enhance my development. I am grateful for the opportunities and experiences I have had at ${company}, and I am eager to apply what I have learned in future endeavors.`;
    case "Personal Reasons":
      return `After careful consideration, I have decided to step away from my role to focus on personal matters that require my full attention at this time. This was not an easy decision, as my time at ${company} has been genuinely rewarding. I am grateful for the understanding and support I have received, and I remain committed to ensuring a smooth handover before I leave.`;
    case "Relocation":
      return `Due to an upcoming relocation, I am no longer able to continue in my current role. This decision is driven entirely by personal circumstances rather than my experience at ${company}, which has been overwhelmingly positive. I am thankful for the opportunities I have had here and for the relationships I have built along the way.`;
    case "Health Reasons":
      return `After thoughtful reflection, I have decided to resign in order to prioritize my health and well-being. This was a difficult decision, as my time at ${company} has been both rewarding and meaningful. I deeply appreciate the understanding and support extended to me, and I am committed to making this transition as seamless as possible.`;
    case "Change in Career Path":
      return `After much reflection, I have decided to pursue a different career path that aligns more closely with my long-term goals. While this means stepping away from my current role, I am sincerely grateful for the experience and growth I have gained at ${company}. The skills I have developed here will continue to serve me well as I move in this new direction.`;
    case "Work-Life Balance":
      return `After careful thought, I have decided to make a change that allows me to achieve a healthier work-life balance. This decision reflects my personal priorities and in no way diminishes my appreciation for the opportunities I have had at ${company}. I am grateful for the support of my colleagues and remain dedicated to a smooth transition.`;
    case RL_OTHER_REASON: {
      const r = otherText.trim();
      return r
        ? `After careful consideration, I have decided to resign for ${r.toLowerCase()}. I am grateful for the opportunities and experiences I have had at ${company}, and I am committed to ensuring a smooth and professional transition during my remaining time.`
        : `After careful consideration, I have decided that this is the right time for me to move on. I am grateful for the opportunities and experiences I have had at ${company}, and I am committed to ensuring a smooth and professional transition during my remaining time.`;
    }
    default:
      return "";
  }
}

/**
 * A ready-to-edit gratitude paragraph built from the selected gratitude chips,
 * interpolating the company name and the position being left. Seeds the
 * editable box on the Gratitude step.
 */
export function gratitudeParagraph(
  selected: string[],
  companyName: string,
  position: string
): string {
  if (selected.length === 0) return "";
  const company = companyName.trim() || "this company";
  const items = selected.map((s) => s.toLowerCase());
  const list =
    items.length === 1
      ? items[0]
      : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  const asRole = position.trim() ? ` as a ${position.trim()}` : "";

  return [
    `I am genuinely thankful for the invaluable experiences and ${list} I have gained at ${company}. Your guidance and the collaborative environment have been pivotal in shaping my skills and advancing my career${asRole}.`,
    `These opportunities have significantly enriched my professional journey and paved the way for future endeavors.`,
  ].join("\n\n");
}

/**
 * A ready-to-edit paragraph offering help with a smooth transition. Seeds the
 * editable box on the Assistance step when the user opts in.
 */
export function assistanceParagraph(): string {
  return "I am keen to support the transition by providing insights into ongoing projects and sharing necessary documentation. Please feel free to reach out for any guidance or clarification during my notice period. I am committed to ensuring a seamless handover of my responsibilities.";
}

/** Gratitude chips — multi-select with emoji (Step 6.png). */
export const RL_GRATITUDE: { label: string; emoji: string }[] = [
  { label: "Professional Growth", emoji: "🔥" },
  { label: "Mentorship and Guidance", emoji: "💪" },
  { label: "Team Collaboration", emoji: "🤝" },
  { label: "Learning Opportunities", emoji: "🧫" },
  { label: "Company Culture", emoji: "✌️" },
  { label: "Career Advancement", emoji: "🚀" },
  { label: "Challenging Projects", emoji: "🎯" },
  { label: "Personal Development", emoji: "⭐" },
  { label: "Networking Opportunities", emoji: "🍇" },
];
