import { issues_types, types } from 'Types/session/issue';
import { Segmented } from 'antd';
import { Angry, CircleAlert, Skull, WifiOff } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useStore } from 'App/mstore';

const tagIcons = {
  [types.ALL]: undefined,
  [types.JS_EXCEPTION]: <CircleAlert size={14} />,
  [types.BAD_REQUEST]: <WifiOff size={14} />,
  [types.CLICK_RAGE]: <Angry size={14} />,
  [types.CRASH]: <Skull size={14} />,
  [types.TAP_RAGE]: <Angry size={14} />,
} as Record<string, any>;

function SessionTags() {
  const { projectsStore, sessionStore, searchStore } = useStore();
  const { total } = sessionStore;
  const platform = projectsStore.active?.platform || '';
  const activeTab = searchStore.activeTags;

  return total === 0 &&
    (activeTab.length === 0 || activeTab[0] === 'all') ? null : (
    <div className="flex items-center">
      <Segmented
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
            label: tag.name,
          }))}
        value={activeTab[0]}
        onChange={(value: any) => searchStore.toggleTag(value)}
        size="small"
      />
    </div>
  );
}

export default observer(SessionTags);
