import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Icon } from 'UI'

import { useStore } from 'App/mstore';
import { SpotComment } from 'App/services/spotService';
import { hashString } from "Types/session/session";
import { UserSwitchOutlined, CommentOutlined } from '@ant-design/icons';
import CommentsSection from './CommentsSection';

const TABS = {
  COMMENTS: 'comments',
  ACTIVITY: 'activity',
} as const;

type Tab = (typeof TABS)[keyof typeof TABS];

function SpotPlayer() {
  const { spotStore } = useStore();
  const { spotId } = useParams<{ spotId: string }>();
  const [activeTab, setActiveTab] = React.useState<Tab | null>(null);

  React.useEffect(() => {
    void spotStore.fetchSpotById(spotId);
  }, []);
  if (!spotStore.currentSpot) {
    return <div>loading...</div>;
  }
  console.log(spotStore.currentSpot);

  const closeTab = () => {
    setActiveTab(null);
  };
  return (
    <div className={'w-screen h-screen  flex flex-col'}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        title={spotStore.currentSpot.title}
        user={spotStore.currentSpot.user}
        date={spotStore.currentSpot.createdAt}
      />
      <div className={'w-full h-full flex'}>
        <div className={'w-full h-full flex flex-col justify-between'}>
          <div>url</div>
          <div className={'relative w-full h-full'}>
            <video
              autoPlay
              className={'object-cover absolute top-0 left-0 w-full h-full'}
              src={spotStore.currentSpot?.videoURL}
            />
          </div>
          <div className={'w-full p-4'}>controls</div>
        </div>
        <SideBar
          activeTab={activeTab}
          onClose={closeTab}
          comments={spotStore.currentSpot?.comments ?? []}
        />
      </div>
    </div>
  );
}

function Header({
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
    <div className={'flex items-center gap-4 p-4 w-full bg-white border-b border-gray-light'}>
      <div>
        <div className={'flex items-center gap-2'}>
          <Icon name={'orSpot'} size={24} />
          <div className={'text-lg font-semibold'}>Spot</div>
        </div>
        <div className={'text-disabled-text text-xs'}>by OpenReplay</div>
      </div>
      <div className={'h-full rounded-xl bg-gray-light mx-2'} style={{ width: 1 }} />
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

function SideBar({
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

export default observer(SpotPlayer);
