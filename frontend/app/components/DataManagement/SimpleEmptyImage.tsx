import React from 'react';

import AnimatedSVG from 'Shared/AnimatedSVG';
import { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

function SimpleEmptyImage() {
  return <AnimatedSVG name={ICONS.NO_RESULTS} size={60} />;
}

export default SimpleEmptyImage;
