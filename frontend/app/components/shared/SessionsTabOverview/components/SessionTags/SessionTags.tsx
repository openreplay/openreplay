import { issues_types, types } from 'Types/session/issue';
import { Grid, Segmented } from 'antd';
import { Angry, CircleAlert, Skull, WifiOff, ChevronDown, MessageCircleWarning } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

const { useBreakpoint } = Grid;

const tagIcons = {
  [types.ALL]: undefined,
  [types.JS_EXCEPTION]: <CircleAlert size={14} />,
  [types.BAD_REQUEST]: <WifiOff size={14} />,
  [types.CLICK_RAGE]: <Angry size={14} />,
  [types.CRASH]: <Skull size={14} />,
  [types.TAP_RAGE]: <Angry size={14} />,
  [types.INCIDENT]: <MessageCircleWarning size={14} />,
} as Record<string, any>;

function SessionTags() {
  const { t } = useTranslation();
  const screens = useBreakpoint();
  const { projectsStore, searchStore } = useStore();
  const platform = projectsStore.active?.platform || '';
  const activeTab = searchStore.activeTags;

  React.useEffect(() => {
    searchStore.resetTags();
  }, [projectsStore.activeSiteId])

  return (
    <div className="flex items-center">
      <Segmented
        vertical={!screens.md}
        options={issues_types
          .filter(
            (tag) =>
              tag.type !== 'mouse_thrashing' &&
              (platform === 'web'
                ? tag.type !== types.TAP_RAGE
                : tag.type !== types.CLICK_RAGE),
          )
          .map((tag: any) => ({
            value: tag.type,
            icon: tagIcons[tag.type],
            label: t(tag.name),
          }))}
        value={activeTab[0]}
        onChange={(value: any) => searchStore.toggleTag(value)}
        size="small"
      />
    </div>
  );
}

export default observer(SessionTags);
