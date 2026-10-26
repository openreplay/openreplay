const SUFFIX = /^(inc|llc|ltd|gmbh|sa|sas|co|corp)$/i;

/** Two letters for a project or organisation badge: a domain by its first
 *  label (frontend.acme.com is FR), two words by their initials, one word by
 *  its first two letters. */
export function monogramOf(name: string): string {
  const bare = name
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./i, '');
  const label = /^[\w-]+(\.[\w-]+)+$/.test(bare) ? bare.split('.')[0] : bare;
  const words = label
    .split(/[\s_\-,.]+/)
    .filter((w) => w && !SUFFIX.test(w))
    .map((w) => Array.from(w));
  const letters =
    words.length > 1
      ? words[0][0] + words[1][0]
      : (words[0] ?? []).slice(0, 2).join('');
  return letters.toUpperCase() || '?';
}
