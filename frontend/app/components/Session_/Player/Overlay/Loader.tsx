import React from 'react';
import { Loader } from 'UI';
import ovStl from './overlay.css';

export default function OverlayLoader() {
  return <div className={ovStl.overlay}><Loader loading /></div>
}