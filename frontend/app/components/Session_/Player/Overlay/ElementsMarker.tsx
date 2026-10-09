import type { MarkedTarget } from 'Player';
import React from 'react';

import Marker from './ElementsMarker/Marker';

export default function ElementsMarker({
  targets,
  hot,
}: {
  targets: MarkedTarget[];
  /** the selector whose row is under the pointer in the click map */
  hot: string | null;
}) {
  return (
    <>
      {targets.map((t) => (
        <Marker key={t.index} target={t} hot={hot === t.selector} />
      ))}
    </>
  );
}
