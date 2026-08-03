import React from 'react';

/** The faded count that rides a label: `All 11`, `By OpenReplay 10`.
 *
 *  Shared so the Tests and Runs tabs (and later the Issues list, Audits list
 *  and journey-tag manager) render the same look — the kind of lookalike that
 *  drifts the first time someone nudges one copy.
 *
 *  Note the two count grammars, both deliberate: a Segmented option's count is
 *  faded and unpunctuated (this), while counts inside prose or a checkbox label
 *  use a middot — "Critical only · 5", "Tags · 3".
 */
export default function CountSuffix({ n }: { n: number }) {
  return <span style={{ opacity: 0.5, marginLeft: 5 }}>{n}</span>;
}
