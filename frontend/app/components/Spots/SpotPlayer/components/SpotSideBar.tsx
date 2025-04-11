import React from 'react';
import { SpotComment } from 'App/services/spotService';
import CommentsSection from './CommentsSection';
import { Tab, TABS } from '../consts';
import SpotActivity from './SpotActivity';

function SpotPlayerSideBar({
  activeTab,
  onClose,
  comments,
}: {
  activeTab: Tab | null;
  onClose: () => void;
  comments: SpotComment[];
}) {
  if (activeTab === TABS.COMMENTS) {
    return <CommentsSection comments={comments} onClose={onClose} />;
  }
  if (activeTab === TABS.ACTIVITY) {
    return <SpotActivity onClose={onClose} />;
  }

  return null;
}

export default SpotPlayerSideBar;
