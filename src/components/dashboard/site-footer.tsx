/** Footer link labels, rendered as dot-separated placeholder links. */
const LINKS = ["Support", "Privacy policy", "Terms of use"];

/** Site-wide footer: copyright line plus the secondary navigation links. */
export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-8 text-center text-sm text-muted-foreground">
      <span>© 2026, Resume.co. All rights reserved</span>
      <span aria-hidden className="hidden sm:inline">·</span>
      <span className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        {LINKS.map((link, i) => (
          <span key={link} className="inline-flex items-center gap-x-2">
            <a href="#" className="hover:text-foreground">
              {link}
            </a>
            {i < LINKS.length - 1 && <span aria-hidden>·</span>}
          </span>
        ))}
      </span>
    </footer>
  );
}
