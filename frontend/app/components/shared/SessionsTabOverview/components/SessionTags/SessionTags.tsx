import { issues_types, types } from 'Types/session/issue';
import { Segmented, Dropdown } from 'antd';
import {
  Angry,
  CircleAlert,
  Skull,
  WifiOff,
  MessageCircleWarning,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';
import { mobileScreen } from 'App/utils/isMobile';
import { DownOutlined } from '@ant-design/icons';

const tagIcons = {
  [types.ALL]: undefined,
  [types.JS_EXCEPTION]: <CircleAlert size={14} />,
  [types.BAD_REQUEST]: <WifiOff size={14} />,
  [types.CLICK_RAGE]: <Angry size={14} />,
  [types.CRASH]: <Skull size={14} />,
  [types.TAP_RAGE]: <Angry size={14} />,
  [types.INCIDENT]: <MessageCircleWarning size={14} />,
} as Record<string, any>;

const SegmentedSessionTags = observer(() => {
  const { t } = useTranslation();
  const { projectsStore, searchStore } = useStore();
  const platform = projectsStore.active?.platform || '';
  const activeTab = searchStore.activeTags;

  return (
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
            label: t(tag.name),
          }))}
        value={activeTab[0]}
        onChange={(value: any) => searchStore.toggleTag(value)}
        size="small"
      />
    </div>
  );
});

const SessionTagsSelect = observer(() => {
  const { t } = useTranslation();
  const { projectsStore, searchStore } = useStore();
  const platform = projectsStore.active?.platform || '';
  const activeTab = searchStore.activeTags;

  React.useEffect(() => {
    searchStore.resetTags();
  }, [projectsStore.activeSiteId]);

  const relevantTags = issues_types.filter(
    (tag) =>
      tag.type !== 'mouse_thrashing' &&
      (platform === 'web'
        ? tag.type !== types.TAP_RAGE
        : tag.type !== types.CLICK_RAGE),
  );
  const tagNames: any = {};
  relevantTags.forEach((tag) => {
    tagNames[tag.type] = t(tag.name);
  });
  return (
    <Dropdown
      className="w-fit"
      menu={{
        items: relevantTags.map((tag: any) => ({
          value: tag.type,
          label: (
            <div className={'flex gap-2 items-center'}>
              {tagIcons[tag.type]} {t(tag.name)}
            </div>
          ),
          onClick: () => searchStore.toggleTag(tag.type),
        })),
      }}
    >
      <div className="cursor-pointer flex items-center justify-end gap-2">
        {tagIcons[activeTab[0]]}
        {activeTab[0] === 'all' ? <div>{t('All')}</div> : null}
        <DownOutlined />
      </div>
    </Dropdown>
  );
});

function SessionTags() {
  const isMobileDevice = mobileScreen

  return isMobileDevice ? <SessionTagsSelect /> : <SegmentedSessionTags />;
}

export default SessionTags;
