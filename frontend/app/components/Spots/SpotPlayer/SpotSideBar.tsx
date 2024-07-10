import React from 'react'
import { SpotComment } from "App/services/spotService";
import CommentsSection from "./CommentsSection";
import { Tab, TABS } from "./consts";

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

  return null;
}

export default SpotPlayerSideBar