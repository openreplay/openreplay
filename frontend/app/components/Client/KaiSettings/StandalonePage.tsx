import React from 'react';

import { PANEL_SIZES } from 'App/constants/panelSizes';

import KaiSettings from './index';

// Test Agents opened from the main left nav ("Agents" section) rather than the
// Preferences shell — reproduces the standard page container so it renders the same
// in both places. KaiSettings keeps its own SiteDropdown + project provider.
export default function StandalonePage() {
  return (
    <div
      className="w-full mx-auto my-4"
      style={{ maxWidth: PANEL_SIZES.maxWidth }}
    >
      <KaiSettings />
    </div>
  );
}
