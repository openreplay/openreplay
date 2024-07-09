import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  MailOutlined,
  MessageOutlined,
  MoreOutlined,
  SlackOutlined,
} from '@ant-design/icons';
import { Button, Checkbox, Dropdown } from 'antd';
import React from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';

import { Spot } from 'App/mstore/types/spot';
import { spot as spotUrl, withSiteId } from 'App/routes';

interface ISpotListItem {
  spot: Spot;
}

function SpotListItem({ spot }: ISpotListItem) {
  const history = useHistory();
  const { siteId } = useParams<{ siteId: string }>();
  const menuItems = [
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: 'Rename',
    },
    {
      key: 'email',
      label: 'Email Link',
      icon: <MailOutlined />,
    },
    {
      key: 'download',
      label: 'Download Video',
      icon: <DownloadOutlined />,
    },
    {
      key: 'report',
      label: 'Report Issue',
      icon: <ExclamationCircleOutlined />,
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
    },
  ];
  React.useEffect(() => {
    menuItems.splice(1, 0, {
      key: 'slack',
      icon: <SlackOutlined />,
      label: 'Share via Slack',
    });
  }, []);
  const onMenuClick = ({ key }: any) => {
    console.log('Menu item clicked:', key);
  };
  const onSpotClick = (e: any) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      const spotLink = withSiteId(spotUrl(spot.spotId.toString()), siteId);
      const fullLink = `${window.location.origin}${spotLink}`;
      window.open(fullLink, '_blank');
    } else {
      history.push(withSiteId(spotUrl(spot.spotId.toString()), siteId));
    }
  };
  return (
    <div
      className={
        'border rounded-xl overflow-hidden flex flex-col items-start cursor-pointer hover:shadow'
      }
      onClick={onSpotClick}
    >
      <div style={{ width: '100%', height: 180, position: 'relative' }}>
        <img
          src={spot.thumbnail}
          alt={spot.title}
          className={'w-full h-full object-cover'}
        />
        <div
          className={
            'absolute bottom-4 right-4 bg-black text-white p-1 rounded'
          }
        >
          {spot.duration}
        </div>
      </div>
      <div className={'px-2 py-4 w-full'}>
        <div className={'flex items-center gap-2'}>
          <div>
            <Checkbox />
          </div>
          <div>{spot.title}</div>
        </div>
        <div
          className={'flex items-center gap-2 text-disabled-text leading-4'}
          style={{ fontSize: 12 }}
        >
          <div>
            <GlobalOutlined />
          </div>
          <div>{spot.user}</div>
          <div>
            <MessageOutlined />
          </div>
          <div>{spot.createdAt}</div>
          <div className={'ml-auto'}>
            <Dropdown
              menu={{ items: menuItems, onClick: onMenuClick }}
              trigger={['click']}
            >
              <Button type="text" icon={<MoreOutlined />} size={'small'} />
            </Dropdown>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpotListItem;
