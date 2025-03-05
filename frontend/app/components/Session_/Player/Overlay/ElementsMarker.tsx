import React from 'react';
import type { MarkedTarget } from 'Player';
import Marker from './ElementsMarker/Marker';

export default function ElementsMarker({
  targets,
  activeIndex,
}: {
  targets: MarkedTarget[];
  activeIndex: number;
}) {
  return targets ? (
    <>
      {targets.map((t) => (
        <React.Fragment key={t.index}>
          <Marker target={t} active={activeIndex === t.index} />
        </React.Fragment>
      ))}
    </>
  ) : null;
}
