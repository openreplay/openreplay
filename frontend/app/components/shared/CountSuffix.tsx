import React from 'react';

/** The faded count that rides a label: `All 11`, `By OpenReplay 10`. */
export default function CountSuffix({ n }: { n: number }) {
  return <span style={{ opacity: 0.5, marginLeft: 5 }}>{n}</span>;
}
