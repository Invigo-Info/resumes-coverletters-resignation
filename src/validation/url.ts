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

/**
 * A redirect target that is guaranteed to stay on this site, or "" if the value
 * cannot be trusted.
 *
 * `value.startsWith("/")` is the obvious check and it is not enough. A browser
 * reads `//evil.com` as a PROTOCOL-RELATIVE url and navigates off-site, and it
 * normalises backslashes to forward slashes, so a leading slash-backslash pair
 * leaves the origin too. Both pass a startsWith test, which is how an open
 * redirect gets into a checkout flow: a crafted `?next=` on a payment link
 * sends the user to an attacker's page immediately after they have paid, at the
 * exact moment they are primed to re-enter card details.
 *
 * So: one leading slash, never a second separator of either kind, and no
 * whitespace or control characters.
 */
export function safeInternalPath(value: unknown): string {
  if (typeof value !== "string") return "";
  const v = value.trim();
  if (!v.startsWith("/")) return "";
  // Reject a second leading separator in either slash direction.
  if (v.length > 1 && (v[1] === "/" || v[1] === "\\")) return "";
  // No whitespace or control characters anywhere: a raw newline can split a
  // Location header. Written as a code-point check rather than a regex escape
  // range so no literal control byte can end up in this source file.
  for (let i = 0; i < v.length; i += 1) {
    const c = v.charCodeAt(i);
    if (c <= 0x20 || c === 0x7f) return "";
  }
  return v;
}
