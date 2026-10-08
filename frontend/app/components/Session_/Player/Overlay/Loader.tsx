import { Loader } from '@/ui/feedback/Loader';
import React from 'react';

import ovStl from './overlay.module.css';

export default function OverlayLoader() {
  return (
    <div className={ovStl.overlay}>
      <Loader loading />
    </div>
  );
}
