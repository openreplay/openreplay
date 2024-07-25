import {
  ArrowLeftOutlined,
  CommentOutlined,
  LinkOutlined,
  SettingOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { Button, Popover } from 'antd';
import copy from 'copy-to-clipboard';
import React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

import { spotsList } from 'App/routes';
import { hashString } from 'App/types/session/session';
import { Avatar, Icon } from 'UI';

import { TABS, Tab } from '../consts';
import AccessModal from './AccessModal';

const spotLink = spotsList();

function SpotPlayerHeader({
  activeTab,
  setActiveTab,
  title,
  user,
  date,
  isLoggedIn,
  browserVersion,
  resolution,
  platform,
  hasShareAccess,
}: {
  activeTab: Tab | null;
  setActiveTab: (tab: Tab) => void;
  title: string;
  user: string;
  date: string;
  isLoggedIn: boolean;
  browserVersion: string | null;
  resolution: string | null;
  platform: string | null;
  hasShareAccess: boolean;
}) {
  const [isCopied, setIsCopied] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const onCopy = () => {
    setIsCopied(true);
    copy(window.location.href);
    setTimeout(() => setIsCopied(false), 2000);
  };
  return (
    <div
      className={
        'flex items-center gap-4 p-4 w-full bg-white border-b border-gray-light'
      }
    >
      <div>
        {isLoggedIn ? (
          <Link to={spotLink}>
            <div className={'flex items-center gap-2'}>
              <ArrowLeftOutlined />
              <div className={'font-semibold'}>All spots</div>
            </div>
          </Link>
        ) : (
          <>
            <div className={'flex items-center gap-2'}>
              <Icon name={'orSpot'} size={24} />
              <div className={'text-lg font-semibold'}>Spot</div>
            </div>
            <div className={'text-disabled-text text-xs'}>by OpenReplay</div>
          </>
        )}
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
            {browserVersion && (
              <>
                <div>·</div>
                <div>Chrome v{browserVersion}</div>
              </>
            )}
            {resolution && (
              <>
                <div>·</div>
                <div>{resolution}</div>
              </>
            )}
            {platform && (
              <>
                <div>·</div>
                <div>{platform}</div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className={'ml-auto'} />
      {isLoggedIn ? (
        <>
          <Button
            size={'small'}
            onClick={onCopy}
            type={'primary'}
            icon={<LinkOutlined />}
          >
            {isCopied ? 'Copied!' : 'Copy Link'}
          </Button>
          {hasShareAccess ? (
            <Popover open={dropdownOpen} content={<AccessModal />}>
              <Button
                size={'small'}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                icon={<SettingOutlined />}
              >
                Manage Access
              </Button>
            </Popover>
          ) : null}
          <div
            className={'h-full rounded-xl bg-gray-light mx-2'}
            style={{ width: 1 }}
          />
        </>
      ) : null}
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

export default connect((state: any) => {
  const jwt = state.getIn(['user', 'jwt']);
  const isEE = state.getIn(['user', 'account', 'edition']) === 'ee';
  const permissions: string[] =
    state.getIn(['user', 'account', 'permissions']) || [];

  const hasShareAccess = isEE ? permissions.includes('SPOT_PUBLIC') : true;
  return { isLoggedIn: !!jwt, hasShareAccess };
})(SpotPlayerHeader);
