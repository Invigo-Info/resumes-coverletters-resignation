/**
 * Capitalize the first letter of each word, as the user types.
 *
 * "sales manager" -> "Sales Manager", "harvard university" -> "Harvard University".
 * Word boundaries are whitespace, hyphens, and slashes, so "New Hampshire-Main"
 * and "UI/UX" capitalize correctly. Unicode-aware, so "ecole" and "eleve" behave
 * the same as accented spellings.
 */
export function titleCase(value: string): string {
  return value.replace(/(^|[\s/-])(\p{Ll})/gu, (_, sep, ch: string) => sep + ch.toUpperCase());
}
