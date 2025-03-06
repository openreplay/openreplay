/* eslint-disable i18next/no-literal-string */
import {
  ArrowLeftOutlined,
  CommentOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  MoreOutlined,
  SettingOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Dropdown,
  MenuProps,
  Popover,
  Tooltip,
  message,
} from 'antd';
import copy from 'copy-to-clipboard';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

import Tabs from 'App/components/Session/Tabs';
import { useStore } from 'App/mstore';
import { spotsList } from 'App/routes';
import { hashString } from 'App/types/session/session';
import { Avatar, Icon } from 'UI';

import { TABS, Tab } from '../consts';
import AccessModal from './AccessModal';
import { useTranslation } from 'react-i18next';

const spotLink = spotsList();

function SpotPlayerHeader({
  activeTab,
  setActiveTab,
  title,
  user,
  date,
  browserVersion,
  resolution,
  platform,
}: {
  activeTab: Tab | null;
  setActiveTab: (tab: Tab) => void;
  title: string;
  user: string;
  date: string;
  browserVersion: string | null;
  resolution: string | null;
  platform: string | null;
}) {
  const { t } = useTranslation();
  const { spotStore, userStore } = useStore();
  const isLoggedIn = !!userStore.jwt;
  const hasShareAccess = userStore.isEnterprise
    ? userStore.account.permissions.includes('SPOT_PUBLIC')
    : true;
  const comments = spotStore.currentSpot?.comments ?? [];

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const history = useHistory();

  const onCopy = () => {
    copy(window.location.href);
    message.success(t('Internal sharing link copied to clipboard'));
  };

  const navigateToSpotsList = () => {
    history.push(spotLink);
  };

  const items: MenuProps['items'] = [
    {
      key: '1',
      icon: <DownloadOutlined />,
      label: t('Download Video'),
    },
    {
      key: '2',
      icon: <DeleteOutlined />,
      label: t('Delete'),
    },
  ];

  const onMenuClick = async ({ key }: { key: string }) => {
    if (key === '1') {
      const { url } = await spotStore.getVideo(spotStore.currentSpot!.spotId);
      await downloadFile(url, `${spotStore.currentSpot!.title}.webm`);
    } else if (key === '2') {
      spotStore.deleteSpot([spotStore.currentSpot!.spotId]).then(() => {
        history.push(spotsList());
        message.success(t('Spot successfully deleted'));
      });
    }
  };

  return (
    <div className="flex items-center gap-1 p-2 py-1 w-full bg-white border-b">
      <div>
        {isLoggedIn ? (
          <Button
            type="text"
            onClick={navigateToSpotsList}
            icon={<ArrowLeftOutlined />}
            className="px-2"
          >
            {t('All Spots')}
          </Button>
        ) : (
          <a
            href="https://openreplay.com/spot"
            target="_blank"
            rel="noreferrer"
          >
            <Button
              type="text"
              className="orSpotBranding flex gap-1 items-center py-2"
            >
              <Icon name="orSpot" size={28} />
              <div className="flex flex-col justify-start text-start">
                <div className="text-lg font-semibold">{t('Spot')}</div>
                <div className="text-disabled-text text-xs -mt-1">
                  {t('by OpenReplay')}
                </div>
              </div>
            </Button>
          </a>
        )}
      </div>
      <div className="h-full rounded-xl border-l mr-2" style={{ width: 1 }} />
      <div className="flex items-center gap-2">
        <Avatar seed={hashString(user)} />
        <div>
          <Tooltip title={title}>
            <div className="w-9/12 text-ellipsis truncate cursor-normal">
              {title}
            </div>
          </Tooltip>
          <div className="flex items-center gap-2 text-black/50 text-sm">
            <div>{user}</div>
            <div>·</div>
            <div className="capitalize">{date}</div>
            {browserVersion && (
              <>
                <div>·</div>
                <div>Chromium v{browserVersion}</div>
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
      <div className="ml-auto" />
      {isLoggedIn ? (
        <>
          <Button
            size="small"
            onClick={onCopy}
            type="default"
            icon={<CopyOutlined />}
          >
            {t('Copy')}
          </Button>
          {hasShareAccess ? (
            <Popover trigger="click" content={<AccessModal />}>
              <Button
                size="small"
                icon={<SettingOutlined />}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {t('Manage Access')}
              </Button>
            </Popover>
          ) : null}
          <Dropdown
            menu={{ items, onClick: onMenuClick }}
            placement="bottomRight"
          >
            <Button icon={<MoreOutlined />} size="small" />
          </Dropdown>
          <div
            className="h-full rounded-xl border-l mx-2"
            style={{ width: 1 }}
          />
        </>
      ) : null}
      <Tabs
        className="!w-fit !border-b-0"
        tabs={[
          {
            key: TABS.ACTIVITY,
            text: t('Activity'),
            iconComp: (
              <div className="mr-1">
                <UserSwitchOutlined />
              </div>
            ),
          },
          {
            key: TABS.COMMENTS,
            iconComp: (
              <div className="mr-1">
                <CommentOutlined />
              </div>
            ),
            text: (
              <div>
                {t('Comments')}{' '}
                {comments.length > 0 && (
                  <Badge
                    count={comments.length}
                    className="mr-2"
                    style={{ fontSize: '10px' }}
                    size="small"
                    color="#454545"
                  />
                )}
              </div>
            ),
          },
        ]}
        active={activeTab}
        onClick={(k) =>
          k === activeTab ? setActiveTab(null) : setActiveTab(k)
        }
      />
    </div>
  );
}

async function downloadFile(url: string, fileName: string) {
  const { t } = useTranslation();
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(t('Network response was not ok'));
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

export default observer(SpotPlayerHeader);
