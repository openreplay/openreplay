import { CommentOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React from 'react';

import { hashString } from 'App/types/session/session';
import { Avatar, Icon } from 'UI';

import { TABS, Tab } from '../consts';

function SpotPlayerHeader({
  activeTab,
  setActiveTab,
  title,
  user,
  date,
}: {
  activeTab: Tab | null;
  setActiveTab: (tab: Tab) => void;
  title: string;
  user: string;
  date: string;
}) {
  return (
    <div
      className={
        'flex items-center gap-4 p-4 w-full bg-white border-b border-gray-light'
      }
    >
      <div>
        <div className={'flex items-center gap-2'}>
          <Icon name={'orSpot'} size={24} />
          <div className={'text-lg font-semibold'}>Spot</div>
        </div>
        <div className={'text-disabled-text text-xs'}>by OpenReplay</div>
      </div>
      <div
        className={'h-full rounded-xl bg-gray-light mx-2'}
        style={{ width: 1 }}
      />
      <div className={'flex items-center gap-2'}>
        <Avatar seed={hashString(user)} />
        <div>
          <div>{title}</div>
          <div className={'flex items-center gap-2 text-disabled-text'}>
            <div>{user}</div>
            <div>·</div>
            <div>{date}</div>
          </div>
        </div>
      </div>
      <div className={'ml-auto'} />
      <Button
        size={'small'}
        disabled={activeTab === TABS.ACTIVITY}
        onClick={() => setActiveTab(TABS.ACTIVITY)}
        icon={<UserSwitchOutlined />}
      >
        Activity
      </Button>
      <Button
        size={'small'}
        disabled={activeTab === TABS.COMMENTS}
        onClick={() => setActiveTab(TABS.COMMENTS)}
        icon={<CommentOutlined />}
      >
        Comments
      </Button>
    </div>
  );
}

export default SpotPlayerHeader;
