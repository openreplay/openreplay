import React from 'react';
import Marker from './ElementsMarker/Marker';

export default function ElementsMarker({ targets, activeIndex }) {
  return targets && targets.map(t => <Marker target={t} active={activeIndex === t.index - 1}/>)
}



