import { DownOutlined, LinkOutlined, StopOutlined } from '@ant-design/icons';
import { Button, Dropdown, Segmented } from 'antd';
import copy from 'copy-to-clipboard';
import React from 'react';

import { useStore } from 'App/mstore';
import { confirm } from 'UI';

const HOUR_SECS = 60 * 60;
const DAY_SECS = 24 * HOUR_SECS;
const WEEK_SECS = 7 * DAY_SECS;

enum Intervals {
  hour,
  threeHours,
  day,
  week,
}

function AccessModal() {
  const { spotStore } = useStore();
  const [isCopied, setIsCopied] = React.useState(false);
  const [isPublic, setIsPublic] = React.useState(!!spotStore.pubKey);
  const [generated, setGenerated] = React.useState(!!spotStore.pubKey);

  const expirationValues = {
    [Intervals.hour]: HOUR_SECS,
    [Intervals.threeHours]: 3 * HOUR_SECS,
    [Intervals.day]: DAY_SECS,
    [Intervals.week]: WEEK_SECS,
  };
  const spotId = spotStore.currentSpot!.spotId!;
  const spotLink = `${window.location.origin}/spot/${spotId}?pub_key=${
    spotStore.pubKey ? spotStore.pubKey.value : ''
  }`;

  const menuItems = [
    {
      key: Intervals.hour,
      label: <div>One Hour</div>,
    },
    {
      key: Intervals.threeHours,
      label: <div>Three Hours</div>,
    },
    {
      key: Intervals.day,
      label: <div>One Day</div>,
    },
    {
      key: Intervals.week,
      label: <div>One Week</div>,
    },
  ];
  const onMenuClick = ({ key }: { key: Intervals }) => {
    const val = expirationValues[key];
    if (
      spotStore.pubKey?.expiration &&
      Math.abs(spotStore.pubKey?.expiration - val) / val < 0.1
    ) {
      return;
    }
    void spotStore.generateKey(spotId, val);
  };

  const changeAccess = async (toPublic: boolean) => {
    if (isPublic && !toPublic && spotStore.pubKey) {
      if (
        await confirm({
          header: 'Confirm',
          confirmButton: 'Disable',
          confirmation:
            'Are you sure you want to disable public sharing for this spot?',
        })
      ) {
        void spotStore.generateKey(spotId, 0);
      }
    }
    setIsPublic(toPublic);
  };
  const revokeKey = async () => {
    if (
      await confirm({
        header: 'Confirm',
        confirmButton: 'Disable',
        confirmation:
          'Are you sure you want to disable public sharing for this spot?',
      })
    ) {
      void spotStore.generateKey(spotId, 0);
      setGenerated(false);
      setIsPublic(false);
    }
  };
  const generateInitial = async () => {
    const k = await spotStore.generateKey(
      spotId,
      expirationValues[Intervals.hour]
    );
    setGenerated(!!k);
  };

  const onCopy = () => {
    setIsCopied(true);
    copy(spotLink);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className={'flex flex-col gap-4 align-start'}
      style={{ width: 420, height: generated ? 240 : 200 }}
    >
      <div>
        <div className={'font-semibold mb-2'}>Who can access this Spot</div>
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
            <div className={'text-disabled-text'}>
              All team members in your project will able to view this Spot
            </div>
            <div className={'px-2 py-1 border rounded bg-[#FAFAFA] w-fit whitespace-nowrap overflow-ellipsis overflow-hidden'}>
              {spotLink}
            </div>
          </div>
          <div className={'w-fit'}>
            <Button
              size={'small'}
              onClick={onCopy}
              type={'text'}
              icon={<LinkOutlined />}
            >
              {isCopied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
        </>
      ) : !generated ? (
        <div className={'w-fit'}>
          <Button
            loading={spotStore.isLoading}
            onClick={generateInitial}
            type={'primary'}
            ghost
          >
            Enable Public Sharing
          </Button>
        </div>
      ) : (
        <>
          <div>
            <div className={'text-disabled-text'}>Anyone with following link will be able to view this spot</div>
            <div className={'px-2 py-1 border rounded bg-[#FAFAFA] whitespace-nowrap overflow-ellipsis overflow-hidden'}>
              {spotLink}
            </div>
          </div>
          <div>
            <div>Link expires in</div>
            <Dropdown menu={{ items: menuItems, onClick: onMenuClick }}>
              <div>
                {spotStore.isLoading ? 'Loading' : 'date here'}
                <DownOutlined />
              </div>
            </Dropdown>
          </div>
          <div className={'flex items-center gap-2'}>
            <div className={'w-fit'}>
              <Button
                type={'primary'}
                ghost
                size={'small'}
                onClick={onCopy}
                icon={<LinkOutlined />}
              >
                {isCopied ? 'Copied!' : 'Copy Link'}
              </Button>
            </div>
            <Button type={'text'} icon={<StopOutlined />} onClick={revokeKey}>
              Disable Public Sharing
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default AccessModal;
