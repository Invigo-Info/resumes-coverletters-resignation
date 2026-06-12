function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Normalise a letter body to HTML paragraphs. The AI/fallback returns plain
 * text (paragraphs split by blank lines); the rich-text editor and preview
 * both work in HTML. Already-HTML input is passed through unchanged.
 */
export function bodyToHtml(text: string): string {
  if (!text) return "";
  if (/<\w+[^>]*>/.test(text)) return text; // already HTML
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
