import { ArrowLeftOutlined, CommentOutlined, CopyOutlined, DeleteOutlined, DownloadOutlined, MoreOutlined, SettingOutlined, UserSwitchOutlined } from '@ant-design/icons';
import { Badge, Button, Dropdown, MenuProps, Popover, Tooltip, message } from 'antd';
import copy from 'copy-to-clipboard';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { connect } from 'react-redux';
import { useHistory } from 'react-router-dom';



import { useStore } from 'App/mstore';
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
  const { spotStore } = useStore();
  const comments = spotStore.currentSpot?.comments ?? [];

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const history = useHistory();

  const onCopy = () => {
    copy(window.location.href);
    message.success('Internal sharing link copied to clipboard');
  };

  const navigateToSpotsList = () => {
    history.push(spotLink);
  };

  const items: MenuProps['items'] = [
    {
      key: '1',
      icon: <DownloadOutlined />,
      label: 'Download Video',
    },
    {
      key: '2',
      icon: <DeleteOutlined />,
      label: 'Delete',
    },
  ];

  const onMenuClick = async ({ key }: { key: string }) => {
    if (key === '1') {
      const { url } = await spotStore.getVideo(spotStore.currentSpot!.spotId);
      await downloadFile(url, `${spotStore.currentSpot!.title}.webm`)
    } else if (key === '2') {
      spotStore.deleteSpot([spotStore.currentSpot!.spotId]).then(() => {
        history.push(spotsList());
        message.success('Spot deleted successfully'); 
      });
    }
  };

  return (
    <div
      className={'flex items-center gap-1 p-2 py-1 w-full bg-white border-b'}
    >
      <div>
        {isLoggedIn ? (
          <Button
            type="text"
            onClick={navigateToSpotsList}
            icon={<ArrowLeftOutlined />}
            className="px-2"
          >
            All Spots
          </Button>
        ) : (
          <>
            <a href="https://openreplay.com/spot" target="_blank">
              <Button
                type="text"
                className="orSpotBranding flex gap-1 items-center py-2"
              >
                <Icon name={'orSpot'} size={28} />
                <div className="flex flex-col justify-start text-start">
                  <div className={'text-lg font-semibold'}>Spot</div>
                  <div className={'text-disabled-text text-xs -mt-1'}>
                    by OpenReplay
                  </div>
                </div>
              </Button>
            </a>
          </>
        )}
      </div>
      <div className={'h-full rounded-xl border-l mr-2'} style={{ width: 1 }} />
      <div className={'flex items-center gap-2'}>
        <Avatar seed={hashString(user)} />
        <div>
          <Tooltip title={title}>
            <div className="w-9/12 text-ellipsis truncate cursor-normal">
              {title}
            </div>
          </Tooltip>
          <div className={'flex items-center gap-2 text-black/50 text-sm'}>
            <div>{user}</div>
            <div>·</div>
            <div className="capitalize">{date}</div>
            {browserVersion && (
              <>
                <div>·</div>
                <div className="capitalize">Chrome v{browserVersion}</div>
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
                <div className="capitalize">{platform}</div>
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
            type={'default'}
            icon={<CopyOutlined />}
          >
            Copy
          </Button>
          {hasShareAccess ? (
            <Popover trigger={'click'} content={<AccessModal />}>
              <Button
                size={'small'}
                icon={<SettingOutlined />}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                Manage Access
              </Button>
            </Popover>
          ) : null}
          <Dropdown
            menu={{ items, onClick: onMenuClick }}
            placement="bottomRight"
          >
            <Button icon={<MoreOutlined />} size={'small'}></Button>
          </Dropdown>
          <div
            className={'h-full rounded-xl border-l mx-2'}
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
        {comments.length > 0 && (
          <Badge count={comments.length} className="mr-2" style={{ fontSize: '10px' }} size='small' color='#454545' />
        )}
      </Button>
    </div>
  );
}

async function downloadFile(url: string, fileName: string) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
  }
}

export default connect((state: any) => {
  const jwt = state.getIn(['user', 'jwt']);
  const isEE = state.getIn(['user', 'account', 'edition']) === 'ee';
  const permissions: string[] =
    state.getIn(['user', 'account', 'permissions']) || [];

  const hasShareAccess = isEE ? permissions.includes('SPOT_PUBLIC') : true;
  return { isLoggedIn: !!jwt, hasShareAccess };
})(observer(SpotPlayerHeader));
