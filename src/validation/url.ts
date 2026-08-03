/**
 * URL helpers for the Links section.
 *
 * A resume shows a link the way a person reads it ("linkedin.com/in/jhon"),
 * while the anchor still points at the full address the user typed. These two
 * jobs are deliberately separate: `displayUrl` is for humans, `normalizeUrl`
 * for the browser.
 */

/** Everything before the host: "https://", "http://", or nothing. */
const PROTOCOL = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * The absolute address to navigate to. A bare "linkedin.com/in/jhon" would
 * otherwise resolve against our own origin, so it gets an https:// prefix.
 * Returns "" when there is nothing usable to link to.
 */
export function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v) return "";
  return PROTOCOL.test(v) ? v : `https://${v}`;
}

/**
 * How the link reads on the resume: no protocol, no "www.", no trailing slash.
 * "https://www.linkedin.com" -> "linkedin.com"
 * "https://linkedin.com/in/jhon/" -> "linkedin.com/in/jhon"
 * A value that is nothing but a protocol has no readable form, so it renders
 * as "" rather than a bare "https://".
 */
export function displayUrl(value: string): string {
  return value
    .trim()
    .replace(PROTOCOL, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

/**
 * Field error for a link, or "" when valid (or empty).
 * Deliberately light: a resume link is checked for shape, not reachability.
 */
export function urlError(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/\s/.test(v)) return "A link can't contain spaces.";
  const host = displayUrl(v).split("/")[0];
  if (!host.includes(".") || /^\.|\.$/.test(host)) {
    return "Enter a full link, like linkedin.com/in/you.";
  }
  return "";
}
