/**
 * Inject INLINE `margin-bottom` onto block-level elements in an HTML string.
 *
 * Why: the PDF export rasterizes the preview with html2canvas, which does not
 * reliably honor paragraph spacing that comes from Tailwind selector rules
 * (`space-y-*` uses a sibling combinator + CSS variable; `[&_p]:mb-*` is a
 * descendant rule). Those gaps show on screen but collapse in the PDF. Inline
 * styles are always rendered, so paragraph spacing survives the export.
 *
 * Lists items (`<li>`) are intentionally left tight; only paragraph/heading/list
 * containers get the gap.
 */
export function spaceBlocks(html: string, em = 0.9): string {
  if (!html) return html;
  const gap = `margin-top:0;margin-bottom:${em}em`;
  return html.replace(
    /<(p|ul|ol|h[1-6]|blockquote)((?:\s[^>]*)?)>/gi,
    (_full, tag: string, attrs: string) => {
      const a = attrs || "";
      const styleMatch = /style\s*=\s*(["'])([\s\S]*?)\1/i.exec(a);
      if (styleMatch) {
        const merged = `${styleMatch[2].replace(/;?\s*$/, "")};${gap}`;
        const newAttrs = a.replace(styleMatch[0], `style="${merged}"`);
        return `<${tag}${newAttrs}>`;
      }
      return `<${tag}${a} style="${gap}">`;
    }
  );
}
