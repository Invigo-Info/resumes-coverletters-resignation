const LINKS = ["Support", "Privacy policy", "Terms of use"];

export function SiteFooter() {
  return (
    <footer className="py-8 text-center text-sm text-muted-foreground">
      <span>© 2026, Resume.co. All rights reserved</span>
      <span className="mx-2">·</span>
      {LINKS.map((link, i) => (
        <span key={link}>
          <a href="#" className="hover:text-foreground">
            {link}
          </a>
          {i < LINKS.length - 1 && <span className="mx-2">·</span>}
        </span>
      ))}
    </footer>
  );
}
