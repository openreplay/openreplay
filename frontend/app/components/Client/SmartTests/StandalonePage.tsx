import React from 'react';

import SmartTests from './index';

// Synthetics opened from the main left nav rather than the Preferences shell.
export default function StandalonePage() {
  return <SmartTests standalone />;
}
