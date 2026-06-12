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
