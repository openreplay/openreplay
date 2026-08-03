import React from 'react';

/** The faded count that rides a label: `All 11`, `By OpenReplay 10`.
 *
 *  One definition, one look (it was written inline in several places — the
 *  Issues category tabs, the Tests/Runs/Audits tabs, the journey-tag manager).
 *
 *  Two count grammars, both deliberate: a Segmented option's count is faded and
 *  unpunctuated (this), while counts inside prose or a checkbox label use a
 *  middot — "Critical only · 5", "Tags · 3".
 */
export default function CountSuffix({ n }: { n: number }) {
  return <span style={{ opacity: 0.5, marginLeft: 5 }}>{n}</span>;
}
