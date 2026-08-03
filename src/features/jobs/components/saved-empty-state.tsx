"use client";

/**
 * Inline illustration for the empty Saved-jobs state: a person scanning the
 * horizon with binoculars in a soft sky panel. Built from plain SVG shapes
 * (no emoji, no external asset) so it stays crisp and on-brand.
 */
function BinocularsScene() {
  return (
    <svg
      viewBox="0 0 280 200"
      width="280"
      height="200"
      role="img"
      aria-label="A person looking through binoculars"
      className="h-auto w-64"
    >
      {/* Sky panel */}
      <rect x="0" y="0" width="280" height="200" rx="20" fill="#EEF2FF" />
      {/* Clouds */}
      <g fill="#DCE3F7">
        <ellipse cx="60" cy="120" rx="34" ry="14" />
        <ellipse cx="210" cy="135" rx="40" ry="16" />
      </g>
      {/* Rolling hills */}
      <path d="M0 160 Q70 138 140 158 T280 156 V200 H0 Z" fill="#C7D2FE" />
      <path d="M0 176 Q90 160 180 176 T280 172 V200 H0 Z" fill="#A9B8F4" />
      {/* Sparkles (four-point stars, not emoji) */}
      <g fill="#F4B740">
        <path d="M196 44 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" />
        <path d="M168 74 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" />
        <path d="M222 78 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 z" />
      </g>
      {/* Figure */}
      <g>
        {/* Torso */}
        <path d="M96 200 q0 -46 44 -46 q44 0 44 46 z" fill="#3B5BD9" />
        {/* Head */}
        <circle cx="140" cy="120" r="24" fill="#F1C79B" />
        {/* Hair */}
        <path d="M118 116 q6 -22 30 -20 q16 2 16 16 q-14 -10 -30 -4 q-10 4 -16 8 z" fill="#8A5A34" />
        {/* Arms up to binoculars */}
        <path d="M104 176 q6 -26 30 -34 l6 12 q-20 8 -24 30 z" fill="#3B5BD9" />
        <path d="M176 176 q-6 -26 -30 -34 l-6 12 q20 8 24 30 z" fill="#3B5BD9" />
        {/* Binoculars */}
        <g fill="#1E293B">
          <rect x="120" y="108" width="16" height="20" rx="5" />
          <rect x="144" y="108" width="16" height="20" rx="5" />
          <rect x="134" y="112" width="12" height="6" rx="3" />
        </g>
        <g fill="#334155">
          <circle cx="128" cy="110" r="6" />
          <circle cx="152" cy="110" r="6" />
        </g>
      </g>
    </svg>
  );
}

/**
 * The empty Saved-jobs state. Shown when there are no active saved jobs and no
 * pending undo cards - teaches the user what the tab is for.
 */
export function SavedEmptyState() {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <div className="rounded-2xl bg-[#EEF2FF] p-2">
        <BinocularsScene />
      </div>
      <p className="mt-8 max-w-md text-lg font-semibold text-foreground">
        Nothing saved yet. Save interesting jobs to return to them later.
      </p>
    </div>
  );
}
