import React from 'react';
import Marker from './ElementsMarker/Marker';

export default function ElementsMarker({ targets }) {
  return targets.map(t => <Marker target={t} />)
}



