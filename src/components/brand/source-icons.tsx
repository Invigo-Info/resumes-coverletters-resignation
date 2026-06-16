/**
 * Brand logos for the "upload from a cloud source" rows (Dropbox, Google Drive,
 * LinkedIn). These are official brand marks rendered as inline SVG icons — not
 * emoji — so they stay crisp and themeable in size.
 */

export function DropboxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="#0061FF"
        d="M6 1.807 0 5.63l6 3.822 6-3.822L6 1.807ZM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822ZM0 13.274l6 3.822 6-3.822L6 9.452 0 13.274ZM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822ZM6 18.371l6 3.822 6-3.822-6-3.822-6 3.822Z"
      />
    </svg>
  );
}

export function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 87.3 78" className={className} aria-hidden focusable="false">
      <path
        fill="#0066da"
        d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
      />
      <path
        fill="#00ac47"
        d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z"
      />
      <path
        fill="#ea4335"
        d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
      />
      <path
        fill="#00832d"
        d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
      />
      <path
        fill="#2684fc"
        d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
      />
      <path
        fill="#ffba00"
        d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
      />
    </svg>
  );
}

export function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M7.2 9.3H4.5V19h2.7V9.3ZM5.85 8.1a1.57 1.57 0 1 0 0-3.14 1.57 1.57 0 0 0 0 3.14ZM19.5 19h-2.7v-4.75c0-1.13-.02-2.58-1.57-2.58-1.57 0-1.81 1.23-1.81 2.5V19h-2.7V9.3h2.59v1.32h.04c.36-.68 1.24-1.4 2.55-1.4 2.73 0 3.23 1.8 3.23 4.13V19Z"
      />
    </svg>
  );
}
