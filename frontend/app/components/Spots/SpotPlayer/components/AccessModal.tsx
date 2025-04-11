import { DownOutlined, CopyOutlined, StopOutlined } from '@ant-design/icons';
import { Button, Dropdown, Menu, Segmented, Modal } from 'antd';
import copy from 'copy-to-clipboard';
import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import {
  formatExpirationTime,
  HOUR_SECS,
  DAY_SECS,
  WEEK_SECS,
} from 'App/utils/index';
import { useTranslation } from 'react-i18next';

enum Intervals {
  hour,
  threeHours,
  day,
  week,
}

function AccessModal() {
  const { t } = useTranslation();
  const { spotStore } = useStore();
  const [isCopied, setIsCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(!!spotStore.pubKey);
  const [generated, setGenerated] = useState(!!spotStore.pubKey);
  const [selectedInterval, setSelectedInterval] = useState<Intervals>(
    Intervals.hour,
  );
  const [loadingKey, setLoadingKey] = useState(false);

  const expirationValues = {
    [Intervals.hour]: HOUR_SECS,
    [Intervals.threeHours]: 3 * HOUR_SECS,
    [Intervals.day]: DAY_SECS,
    [Intervals.week]: WEEK_SECS,
  };
  const spotId = spotStore.currentSpot!.spotId!;
  const spotLink = `${window.location.origin}/view-spot/${spotId}${
    spotStore.pubKey ? `?pub_key=${spotStore.pubKey.value}` : ''
  }`;

  const menuItems = [
    {
      key: Intervals.hour.toString(),
      label: <div>{t('1 Hour')}</div>,
    },
    {
      key: Intervals.threeHours.toString(),
      label: <div>{t('3 Hours')}</div>,
    },
    {
      key: Intervals.day.toString(),
      label: <div>{t('1 Day')}</div>,
    },
    {
      key: Intervals.week.toString(),
      label: <div>{t('1 Week')}</div>,
    },
  ];

  const onMenuClick = async (info: { key: string }) => {
    const val = expirationValues[Number(info.key) as Intervals];
    setSelectedInterval(Number(info.key) as Intervals);
    await spotStore.generateKey(spotId, val);
  };

  const changeAccess = async (toPublic: boolean) => {
    if (isPublic && !toPublic && spotStore.pubKey) {
      await spotStore.generateKey(spotId, 0);
      setIsPublic(toPublic);
    } else {
      setIsPublic(toPublic);
    }
  };

  const revokeKey = async () => {
    await spotStore.generateKey(spotId, 0);
    setGenerated(false);
    setIsPublic(false);
  };

  const generateInitial = async () => {
    setLoadingKey(true);
    const k = await spotStore.generateKey(
      spotId,
      expirationValues[Intervals.hour],
    );
    setGenerated(!!k);
    setLoadingKey(false);
  };

  const onCopy = () => {
    setIsCopied(true);
    copy(spotLink);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 align-start w-96 p-1">
      <div>
        <Segmented
          options={[
            {
              value: 'internal',
              label: 'Internal',
            },
            {
              value: 'public',
              label: 'Public',
            },
          ]}
          value={isPublic ? 'public' : 'internal'}
          onChange={(value) => changeAccess(value === 'public')}
        />
      </div>
      {!isPublic ? (
        <>
          <div>
            <div className="text-black/50">
              {t('Link for internal team members')}
            </div>
            <div className="px-2 py-1 rounded-lg bg-indigo-50 whitespace-nowrap overflow-ellipsis overflow-hidden">
              {spotLink}
            </div>
          </div>
          <div className="w-fit">
            <Button
              size="small"
              onClick={onCopy}
              type="default"
              icon={<CopyOutlined />}
            >
              {isCopied ? t('Copied!') : t('Copy Link')}
            </Button>
          </div>
        </>
      ) : !generated ? (
        <div className="w-fit p-1">
          <Button
            loading={spotStore.isLoading}
            onClick={generateInitial}
            type="primary"
            ghost
            size="small"
            className="mt-1"
          >
            {t('Enable Public Sharing')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-1">
          <div>
            <div className="text-black/50">
              {t('Anyone with the following link can access this Spot')}
            </div>
            <div className="px-2 py-1 rounded-lg bg-indigo-50 whitespace-nowrap overflow-ellipsis overflow-hidden">
              {spotLink}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div>{t('Link expires in')}</div>
            <Dropdown
              overlay={<Menu items={menuItems} onClick={onMenuClick} />}
            >
              <div className="flex items-center cursor-pointer">
                {loadingKey
                  ? t('Loading')
                  : formatExpirationTime(expirationValues[selectedInterval])}
                <DownOutlined />
              </div>
            </Dropdown>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-fit">
              <Button
                type="default"
                size="small"
                onClick={onCopy}
                icon={<CopyOutlined />}
              >
                {isCopied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
            <Button
              type="text"
              size="small"
              icon={<StopOutlined />}
              onClick={revokeKey}
            >
              {t('Disable Public Sharing')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default observer(AccessModal);
