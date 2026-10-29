/**
 * "Skip to main content" link.
 *
 * WCAG 2.4.1 (Bypass Blocks, Level A). Without it, a keyboard or screen-reader
 * user has to tab through the entire header - logo, every section tab, the help
 * pill - on every single page before reaching the thing they came for. In this
 * app the editor header alone is a dozen stops, repeated on each navigation.
 *
 * Visually hidden until focused, then it appears as a normal button. It is the
 * FIRST focusable element in the document, which is the only position that
 * makes it useful.
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only z-[100] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:inline-flex focus:h-11 focus:items-center focus:rounded-[6px] focus:bg-primary focus:px-5 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-3 focus:ring-ring/40 print:hidden"
    >
      Skip to main content
    </a>
  );
}
