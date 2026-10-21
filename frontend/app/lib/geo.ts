/** The city to print beside a country, or '' when it would only repeat it:
 *  an unresolved location comes back as 'UN' in both fields. */
export function cityAfterCode(
  city: string | null | undefined,
  code: string | null | undefined,
): string {
  const c = (city ?? '').trim();
  const up = c.toUpperCase();
  return !c || up === 'UN' || up === (code ?? '').trim().toUpperCase() ? '' : c;
}
