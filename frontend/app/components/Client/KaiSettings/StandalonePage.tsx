import { PANEL_SIZES } from 'App/constants/panelSizes';
import React from 'react';

import KaiSettings from './index';

// Test Agents opened from the main left nav ("Agents" section) instead of
// the Preferences shell — reproduces the Client.tsx container so the page
// renders identically in both places.
export default function StandalonePage() {
  return (
    <div
      className="w-full mx-auto mb-8"
      style={{ maxWidth: PANEL_SIZES.maxWidth }}
    >
      <KaiSettings />
    </div>
  );
}
